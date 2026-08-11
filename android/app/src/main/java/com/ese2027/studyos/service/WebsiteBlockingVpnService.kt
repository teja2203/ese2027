package com.ese2027.studyos.service

import android.app.Notification
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log
import androidx.core.app.NotificationCompat
import com.ese2027.studyos.R
import com.ese2027.studyos.data.local.AppDatabase
import com.ese2027.studyos.data.remote.SupabaseService
import com.ese2027.studyos.ui.MainActivity
import com.ese2027.studyos.util.BlockingPrefs
import com.ese2027.studyos.util.NotificationHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.SocketTimeoutException
import java.nio.ByteBuffer
import java.util.concurrent.ConcurrentHashMap

/**
 * Website blocking DNS shield.
 *
 * Deliberately minimal: the tunnel routes ONLY the DNS server addresses, so
 * ordinary web traffic never enters the VPN and can never be affected by it.
 * Everything this service does is limited to DNS:
 *
 *  - queries for blocked domains are sinkholed (A -> 0.0.0.0, other types ->
 *    NODATA), so the site simply cannot resolve;
 *  - every other query is forwarded to a real resolver and answered with a
 *    correct per-query correlation (the previous single-socket, inline-forward
 *    implementation mismatched responses and stalled, which is what made the
 *    whole internet look blocked);
 *  - TCP/UDP :853 and HTTPS (443) to the routed resolvers are dropped, which
 *    disables DoT/DoH and forces apps back to the controlled system DNS.
 *
 * If this service is not running, browsing is 100% unaffected.
 */
class WebsiteBlockingVpnService : VpnService() {

    companion object {
        const val ACTION_START = "START_VPN"
        const val ACTION_STOP = "STOP_VPN"
        const val ACTION_UPDATE_RULES = "UPDATE_RULES"
        const val NOTIFICATION_ID = 1003

        private const val TAG = "WebsiteBlockingVpn"
        private const val VPN_IP = "10.0.0.2"

        // Fake DNS server INSIDE the tunnel subnet but NOT an interface address.
        // Advertising the interface's own IP as DNS would make the kernel treat
        // queries as local traffic and they would never enter the TUN — which is
        // why every DNS query died and the whole internet looked blocked.
        private const val DNS_IP = "10.0.0.3"
        private const val MTU = 1400
        private const val PACKET_BUFFER = 32767
        private const val DNS_PENDING_TTL_MS = 6000L
        private const val UPSTREAM_IP = "8.8.8.8"
        private const val UPSTREAM_IP_FALLBACK = "1.1.1.1"

        @Volatile
        var isRunning: Boolean = false
            private set
    }

    private class PendingDns(val originalPacket: ByteArray, var timestamp: Long)

    private class DnsQuery(
        val id: Int,
        val name: String,
        val qtype: Int,
        val questionEnd: Int,
        val dnsLength: Int
    )

    private var vpnInterface: ParcelFileDescriptor? = null
    private var workerJob: Job? = null
    private var responderJob: Job? = null
    private var rulesJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    @Volatile
    private var blockedDomains: Set<String> = emptySet()

    private val pendingDns = ConcurrentHashMap<Int, PendingDns>()
    private val writeLock = Any()

    private lateinit var inputStream: FileInputStream
    private lateinit var outputStream: FileOutputStream
    private lateinit var dnsSocket: DatagramSocket
    private var upstream: InetAddress = InetAddress.getByName(UPSTREAM_IP)

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> startVpn()
            ACTION_STOP -> stopVpn()
            ACTION_UPDATE_RULES -> updateRules()
        }
        return START_STICKY
    }

    override fun onRevoke() {
        Log.i(TAG, "VPN revoked by system")
        stopVpn()
    }

    private fun startVpn() {
        if (isRunning) return

        // Android 14 (targetSdk 34) requires an FGS type before startForeground().
        startForeground(NOTIFICATION_ID, createNotification())

        try {
            val builder = Builder()
                .setSession("ESE2027 Website Shield")
                .setMtu(MTU)
                .addAddress(InetAddress.getByName(VPN_IP), 24)
                .addDnsServer(InetAddress.getByName(DNS_IP))
                // Only DNS server addresses are routed. Web traffic stays direct.
                .addRoute(DNS_IP, 32)
                .addRoute(UPSTREAM_IP, 32)
                .addRoute(UPSTREAM_IP_FALLBACK, 32)
                .addRoute("8.8.4.4", 32)
                .addRoute("1.0.0.1", 32)
                .addDisallowedApplication(packageName)
                .setBlocking(true)

            val fd = builder.establish() ?: throw IOException("establish() returned null")
            vpnInterface = fd
            isRunning = true
            inputStream = FileInputStream(fd.fileDescriptor)
            outputStream = FileOutputStream(fd.fileDescriptor)

            dnsSocket = DatagramSocket()
            protect(dnsSocket) // upstream DNS bypasses the VPN
            dnsSocket.soTimeout = 500

            updateRules()
            workerJob = scope.launch { tunLoop() }
            responderJob = scope.launch { dnsResponderLoop() }
            Log.i(TAG, "DNS shield active (${blockedDomains.size} blocked domains)")
        } catch (e: Exception) {
            Log.e(TAG, "startVpn failed", e)
            isRunning = false
            try { vpnInterface?.close() } catch (_: Exception) {}
            vpnInterface = null
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }

    private fun updateRules() {
        rulesJob?.cancel()
        rulesJob = scope.launch {
            val database = AppDatabase.getInstance(this@WebsiteBlockingVpnService)
            val userId = runCatching { SupabaseService.getInstance().getCurrentUserId() }.getOrNull() ?: "local_user"
            database.blockedWebsiteDao().getEnabled(userId).collect { websites ->
                blockedDomains = websites.asSequence()
                    .map { it.domain.lowercase().trim().trimEnd('.') }
                    .filter { it.isNotEmpty() }
                    .toSet()
                Log.d(TAG, "Rules updated: ${blockedDomains.size} user domains")
            }
        }
    }

    private fun shouldKeepRunning(): Boolean =
        BlockingPrefs.isActive(this) || BlockingPrefs.getMode(this) == "always"

    // ── TUN read loop ─────────────────────────────────────────────────────────

    private fun tunLoop() {
        val packet = ByteArray(PACKET_BUFFER)
        var lastSweep = 0L
        var lastStopCheck = 0L
        while (isRunning) {
            val length = try {
                inputStream.read(packet)
            } catch (_: Exception) {
                break
            }
            if (length <= 0) continue
            val now = System.currentTimeMillis()

            if (now - lastSweep > 5000) {
                val cutoff = now - DNS_PENDING_TTL_MS
                pendingDns.entries.removeIf { it.value.timestamp < cutoff }
                lastSweep = now
            }
            if (now - lastStopCheck > 10_000) {
                lastStopCheck = now
                if (!shouldKeepRunning()) {
                    Log.i(TAG, "Focus session ended — stopping shield")
                    stopVpn()
                    return
                }
            }

            handlePacket(packet, length)
        }
    }

    private fun handlePacket(packet: ByteArray, length: Int) {
        if (length < 28) return
        val version = (packet[0].toInt() ushr 4) and 0x0F
        if (version != 4) return // only IPv4 DNS is intercepted
        val ihl = (packet[0].toInt() and 0x0F) * 4
        if (ihl + 4 > length) return
        val protocol = packet[9].toInt() and 0xFF
        val dstPort = readPort(packet, ihl + 2)

        when {
            // DNS queries (UDP :53)
            protocol == 17 && dstPort == 53 -> handleDnsQuery(packet, length, ihl + 8)
            // DoT / DoH to the routed resolvers — drop so clients fall back to
            // the controlled plain-DNS path.
            (protocol == 6 || protocol == 17) && (dstPort == 853) -> Unit // drop
            protocol == 6 && dstPort == 443 -> Unit // drop DoH over HTTPS
            else -> Unit // everything else is not routed and never reaches us
        }
    }

    private fun handleDnsQuery(packet: ByteArray, length: Int, dnsOffset: Int) {
        val query = parseDnsQuery(packet, length, dnsOffset) ?: return
        val name = query.name

        if (isDomainBlocked(name)) {
            Log.d(TAG, "SINKHOLE id=${query.id} domain=$name (src=${ipToString(packet, 12)})")
            writeToTun(buildDnsResponse(packet, dnsOffset, sinkholeDnsPayload(packet, dnsOffset, query)))
            return
        }
        Log.d(TAG, "FORWARD id=${query.id} domain=$name src=${ipToString(packet, 12)}:${readPort(packet, dnsOffset - 8)}")

        // Forward to a real resolver; the responder loop answers with correct
        // per-transaction correlation.
        val payload = ByteArray(length - dnsOffset)
        System.arraycopy(packet, dnsOffset, payload, 0, payload.size)
        try {
            dnsSocket.send(DatagramPacket(payload, payload.size, upstream, 53))
            pendingDns[query.id] = PendingDns(packet.copyOf(length), System.currentTimeMillis())
        } catch (e: IOException) {
            // Resolver unreachable — try the fallback once, then let the client retransmit.
            try {
                upstream = InetAddress.getByName(UPSTREAM_IP_FALLBACK)
                dnsSocket.send(DatagramPacket(payload, payload.size, upstream, 53))
                pendingDns[query.id] = PendingDns(packet.copyOf(length), System.currentTimeMillis())
            } catch (_: Exception) {
                // Ignore: client will retransmit.
            }
        } catch (_: Exception) {
            // Ignore: client will retransmit.
        }
    }

    private fun dnsResponderLoop() {
        val buffer = ByteArray(4096)
        while (isRunning) {
            try {
                val pkt = DatagramPacket(buffer, buffer.size)
                dnsSocket.receive(pkt)
                if (pkt.length < 12) continue
                val id = readPort(buffer, 0)
                val pending = pendingDns.remove(id) ?: continue
                val original = pending.originalPacket
                val dnsOffset = ((original[0].toInt() and 0x0F) * 4) + 8
                Log.d(TAG, "RESPONSE id=$id -> ${ipToString(original, 12)}:${readPort(original, dnsOffset - 8)} (${pkt.length} bytes)")
                writeToTun(buildDnsResponse(original, dnsOffset, buffer.copyOf(pkt.length)))
            } catch (_: SocketTimeoutException) {
                val now = System.currentTimeMillis()
                pendingDns.entries.removeIf { now - it.value.timestamp > DNS_PENDING_TTL_MS }
            } catch (_: Exception) {
                if (!isRunning) break
            }
        }
    }

    // ── Domain matching ───────────────────────────────────────────────────────

    private fun ipToString(packet: ByteArray, offset: Int): String =
        "${packet[offset].toInt() and 0xFF}.${packet[offset + 1].toInt() and 0xFF}." +
            "${packet[offset + 2].toInt() and 0xFF}.${packet[offset + 3].toInt() and 0xFF}"

    private fun isDomainBlocked(domain: String): Boolean {
        if (domain.isBlank()) return false
        val clean = domain.lowercase().trim().trimEnd('.')
        if (clean in blockedDomains) return true
        return blockedDomains.any { blocked -> clean.endsWith(".$blocked") }
    }

    // ── DNS parsing / responses ───────────────────────────────────────────────

    private fun readPort(packet: ByteArray, offset: Int): Int =
        ((packet[offset].toInt() and 0xFF) shl 8) or (packet[offset + 1].toInt() and 0xFF)

    private fun parseDnsQuery(packet: ByteArray, length: Int, dnsOffset: Int): DnsQuery? {
        if (length - dnsOffset < 12) return null
        val id = readPort(packet, dnsOffset)
        val isResponse = (packet[dnsOffset + 2].toInt() shr 7) and 1
        if (isResponse != 0) return null
        val qdcount = readPort(packet, dnsOffset + 4)
        if (qdcount < 1) return null

        val nameBuilder = StringBuilder()
        var pos = dnsOffset + 12
        var end = pos
        var jumped = false
        var jumps = 0
        while (true) {
            if (pos >= length) return null
            val len = packet[pos].toInt() and 0xFF
            when {
                len == 0 -> {
                    if (!jumped) end = pos + 1
                    break
                }
                len and 0xC0 == 0xC0 -> {
                    if (pos + 1 >= length) return null
                    val pointer = ((len and 0x3F) shl 8) or (packet[pos + 1].toInt() and 0xFF)
                    if (!jumped) end = pos + 2
                    if (++jumps > 8 || pointer >= length) return null
                    pos = pointer
                    jumped = true
                }
                else -> {
                    if (pos + 1 + len > length) return null
                    if (nameBuilder.isNotEmpty()) nameBuilder.append('.')
                    for (i in 0 until len) {
                        nameBuilder.append((packet[pos + 1 + i].toInt() and 0xFF).toChar())
                    }
                    pos += 1 + len
                }
            }
        }
        if (end + 4 > length) return null
        val qtype = readPort(packet, end)
        return DnsQuery(
            id = id,
            name = nameBuilder.toString(),
            qtype = qtype,
            questionEnd = end,
            dnsLength = length - dnsOffset
        )
    }

    /** NOERROR answer: A -> 0.0.0.0; every other type -> NODATA. */
    private fun sinkholeDnsPayload(packet: ByteArray, dnsOffset: Int, query: DnsQuery): ByteArray {
        val questionLen = query.questionEnd - (dnsOffset + 12)
        val hasAnswer = query.qtype == 1
        val answerLen = if (hasAnswer) 16 else 0
        val dnsLen = 12 + questionLen + answerLen
        val out = ByteArray(dnsLen)
        val buf = ByteBuffer.wrap(out)

        buf.putShort(query.id.toShort())
        buf.putShort(0x8180.toShort()) // QR=1, RD=1, RA=1, RCODE=0
        buf.putShort(1)
        buf.putShort(if (hasAnswer) 1 else 0)
        buf.putShort(0)
        buf.putShort(0)
        buf.put(packet, dnsOffset + 12, questionLen)

        if (hasAnswer) {
            buf.putShort(0xC00C.toShort())
            buf.putShort(1)
            buf.putShort(1)
            buf.putInt(300)
            buf.putShort(4)
            buf.put(0); buf.put(0); buf.put(0); buf.put(0)
        }
        return out
    }

    private fun buildDnsResponse(original: ByteArray, dnsOffset: Int, dnsPayload: ByteArray): ByteArray {
        val total = 20 + 8 + dnsPayload.size
        val out = ByteArray(total)
        val buf = ByteBuffer.wrap(out)

        // IPv4 header
        buf.put(0x45.toByte())
        buf.put(0)
        buf.putShort(total.toShort())
        buf.putShort(0x1234.toShort())
        buf.putShort(0x4000.toShort())
        buf.put(64.toByte())
        buf.put(17.toByte())
        buf.putShort(0)
        buf.put(original, 16, 4) // src = original dst (the DNS server)
        buf.put(original, 12, 4) // dst = original src (the app)
        val ipChecksum = computeIpv4Checksum(out, 0, 20)
        out[10] = ((ipChecksum ushr 8) and 0xFF).toByte()
        out[11] = (ipChecksum and 0xFF).toByte()

        // UDP header
        buf.position(20)
        buf.putShort(53)
        buf.putShort(readPort(original, dnsOffset - 8).toShort())
        buf.putShort((8 + dnsPayload.size).toShort())
        buf.putShort(0) // 0 is valid for IPv4 UDP

        // DNS payload
        buf.position(28)
        buf.put(dnsPayload)
        return out
    }

    private fun computeIpv4Checksum(data: ByteArray, offset: Int, length: Int): Int {
        var sum = 0
        var i = offset
        while (i < offset + length - 1) {
            sum += ((data[i].toInt() and 0xFF) shl 8) or (data[i + 1].toInt() and 0xFF)
            if (sum > 0xFFFF) sum = (sum and 0xFFFF) + (sum ushr 16)
            i += 2
        }
        if (i < offset + length) {
            sum += (data[i].toInt() and 0xFF) shl 8
            if (sum > 0xFFFF) sum = (sum and 0xFFFF) + (sum ushr 16)
        }
        return sum.inv() and 0xFFFF
    }

    // ── Teardown / helpers ────────────────────────────────────────────────────

    private fun writeToTun(data: ByteArray, length: Int = data.size) {
        try {
            synchronized(writeLock) {
                outputStream.write(data, 0, length)
            }
        } catch (_: Exception) {
            // TUN closed — loop exits on next read.
        }
    }

    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, NotificationHelper.CHANNEL_PROTECTION)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Website Shield Active")
            .setContentText("Blocked sites are being filtered.")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun stopVpn() {
        if (!isRunning && vpnInterface == null) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return
        }
        Log.i(TAG, "Stopping DNS shield")
        isRunning = false
        workerJob?.cancel()
        responderJob?.cancel()
        rulesJob?.cancel()
        pendingDns.clear()
        try { if (::dnsSocket.isInitialized) dnsSocket.close() } catch (_: Exception) {}
        try { vpnInterface?.close() } catch (_: Exception) {}
        vpnInterface = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopVpn()
        scope.cancel()
    }
}
