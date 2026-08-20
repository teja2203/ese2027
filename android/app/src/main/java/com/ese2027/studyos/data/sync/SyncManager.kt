package com.ese2027.studyos.data.sync

import com.ese2027.studyos.data.local.AppDatabase
import com.ese2027.studyos.data.local.FocusSessionEntity
import com.ese2027.studyos.data.local.InAppNotificationEntity
import com.ese2027.studyos.data.local.PlanEntity
import com.ese2027.studyos.data.local.StudyBlockEntity
import com.ese2027.studyos.data.local.SyncQueue
import com.ese2027.studyos.data.remote.SupabaseService
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.min

class SyncManager(
    private val database: AppDatabase,
    private val supabase: SupabaseService
) {
    private val gson = Gson()

    suspend fun enqueueMutation(
        entityType: String,
        entityId: String,
        operation: String,
        payloadObj: Any,
        revision: Long = 1,
        userId: String = supabase.getCurrentUserId() ?: "local_user"
    ) {
        withContext(Dispatchers.IO) {
            val jsonPayload = gson.toJson(payloadObj)
            val mutationId = "$userId:$entityType:$entityId:$revision:$operation:${System.currentTimeMillis()}"
            database.syncQueueDao().insert(
                SyncQueue(
                    entityType = entityType,
                    entityId = entityId,
                    userId = userId,
                    operation = operation,
                    payload = jsonPayload,
                    mutationId = mutationId,
                    revision = revision,
                    createdAt = System.currentTimeMillis()
                )
            )
        }
    }

    suspend fun performFullSync(): Result<Int> = withContext(Dispatchers.IO) {
        try {
            if (!supabase.isLoggedIn()) {
                return@withContext Result.success(0)
            }

            val userId = supabase.getCurrentUserId() ?: return@withContext Result.success(0)

            val pending = database.syncQueueDao().getPending()
            var processedCount = 0
            val legacy = pending.filterNot { it.entityType in NORMALIZED_TYPES }

            pending.filter { it.entityType in NORMALIZED_TYPES }.forEach { item ->
                val payload = payloadMap(item.payload)
                val upload = supabase.uploadDomainMutation(userId, item.entityType, item.operation, toSnakeCase(payload))
                if (upload.isSuccess) {
                    database.syncQueueDao().delete(item.id)
                    processedCount++
                } else {
                    database.syncQueueDao().incrementRetry(
                        item.id,
                        upload.exceptionOrNull()?.message ?: "Domain sync error",
                        retryAt(item.retryCount)
                    )
                }
            }

            if (legacy.isNotEmpty()) {
                val mutations = legacy.map { item ->
                    mapOf(
                        "entity_type" to item.entityType,
                        "entity_id" to item.entityId,
                        "operation" to item.operation,
                        "payload" to gson.fromJson(item.payload, Any::class.java),
                        "created_at" to item.createdAt,
                        "mutation_id" to item.mutationId,
                        "revision" to item.revision
                    )
                }
                val upload = supabase.uploadUserProgress(
                    userId,
                    mapOf("pending_mutations" to mutations, "updated_at" to System.currentTimeMillis())
                )
                if (upload.isFailure) {
                    legacy.forEach { item ->
                        database.syncQueueDao().incrementRetry(
                            item.id,
                            upload.exceptionOrNull()?.message ?: "Sync error",
                            retryAt(item.retryCount)
                        )
                    }
                    return@withContext Result.failure(upload.exceptionOrNull() ?: IllegalStateException("Sync failed"))
                }
                legacy.forEach { item -> database.syncQueueDao().delete(item.id) }
                processedCount += legacy.size
            }

            NORMALIZED_TYPES.forEach { entityType ->
                supabase.downloadDomainRows(userId, entityType).getOrNull()?.let { rows ->
                    rows.forEach { applyRemoteRow(userId, entityType, it) }
                }
            }

            Result.success(processedCount)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun applyRemoteRow(userId: String, entityType: String, remote: Map<String, Any?>) {
        val camel = camelize(remote)
        when (entityType) {
            "plan" -> {
                val incoming = gson.fromJson(gson.toJson(camel), PlanEntity::class.java)
                val local = database.planDao().getById(userId, incoming.id)
                if (local == null || incoming.revision >= local.revision) {
                    database.planDao().insert(incoming.copy(userId = userId, syncStatus = 0))
                }
            }
            "study_block" -> {
                val incoming = gson.fromJson(gson.toJson(camel), StudyBlockEntity::class.java)
                val local = database.studyBlockDao().getById(userId, incoming.id)
                if (local == null || incoming.revision >= local.revision) {
                    database.studyBlockDao().insert(incoming.copy(userId = userId, syncStatus = 0))
                }
            }
            "focus_session" -> {
                val incoming = gson.fromJson(gson.toJson(camel), FocusSessionEntity::class.java)
                val local = database.focusSessionDao().getByIdForUser(userId, incoming.id)
                if (local == null || incoming.revision >= local.revision) {
                    database.focusSessionDao().insert(incoming.copy(userId = userId, syncStatus = 0))
                }
            }
            "notification" -> {
                val incoming = gson.fromJson(gson.toJson(camel), InAppNotificationEntity::class.java)
                val local = database.inAppNotificationDao().getById(userId, incoming.id)
                if (local == null || incoming.revision >= local.revision) {
                    database.inAppNotificationDao().insert(incoming.copy(userId = userId, syncStatus = 0))
                }
            }
        }
    }

    private fun payloadMap(payload: String): Map<String, Any?> {
        val type = object : TypeToken<Map<String, Any?>>() {}.type
        return gson.fromJson(payload, type) ?: emptyMap()
    }

    private fun toSnakeCase(source: Map<String, Any?>): Map<String, Any?> = source
        .filterKeys { it !in setOf("syncStatus") }
        .mapKeys { (key, _) -> camelToSnake(key) }

    private fun camelize(source: Map<String, Any?>): Map<String, Any?> = source
        .filterKeys { it !in setOf("sync_status") }
        .mapKeys { (key, _) -> snakeToCamel(key) }

    private fun camelToSnake(value: String): String = value.replace(Regex("([a-z])([A-Z])"), "$1_$2").lowercase()

    private fun snakeToCamel(value: String): String = value.split('_').mapIndexed { index, part ->
        if (index == 0) part else part.replaceFirstChar { it.uppercase() }
    }.joinToString("")

    private fun retryAt(retryCount: Int): Long {
        val delay = 15_000L * (1L shl retryCount.coerceIn(0, 7))
        return System.currentTimeMillis() + min(delay, 6 * 60 * 60 * 1000L)
    }

    companion object {
        private val NORMALIZED_TYPES = setOf("plan", "study_block", "focus_session", "notification")
    }
}
