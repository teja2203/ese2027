package com.ese2027.studyos.service

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.sin
import kotlin.random.Random

/** Small, offline ambient generator matching the web app's brown/pink/528Hz modes. */
class FocusSoundPlayer {
    private val scope = CoroutineScope(Dispatchers.Default)
    private var job: Job? = null
    private var track: AudioTrack? = null

    fun start(mode: String, volume: Float) {
        stop()
        if (mode == "off") return
        val sampleRate = 44_100
        val minBuffer = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        ).coerceAtLeast(4096)
        val audio = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setSampleRate(sampleRate)
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setBufferSizeInBytes(minBuffer * 2)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()
        audio.setVolume(volume.coerceIn(0f, 1f))
        track = audio
        audio.play()
        job = scope.launch {
            val samples = ShortArray(2048)
            val random = Random.Default
            var brown = 0.0
            var pink = 0.0
            var phase = 0.0
            while (isActive) {
                for (i in samples.indices) {
                    val white = random.nextDouble(-1.0, 1.0)
                    val sample = when (mode) {
                        "brown" -> {
                            brown = (brown + white * 0.035).coerceIn(-1.0, 1.0)
                            brown * 0.72
                        }
                        "pink" -> {
                            pink = pink * 0.985 + white * 0.15
                            pink * 0.62
                        }
                        "sol528" -> {
                            val value = sin(phase) * 0.22
                            phase += 2.0 * PI * 528.0 / sampleRate
                            if (phase > 2.0 * PI) phase -= 2.0 * PI
                            value
                        }
                        else -> 0.0
                    }
                    samples[i] = (sample.coerceIn(-1.0, 1.0) * Short.MAX_VALUE).toInt().toShort()
                }
                audio.write(samples, 0, samples.size, AudioTrack.WRITE_BLOCKING)
            }
        }
    }

    fun stop() {
        job?.cancel()
        job = null
        track?.let {
            runCatching { it.pause() }
            runCatching { it.flush() }
            runCatching { it.release() }
        }
        track = null
    }
}
