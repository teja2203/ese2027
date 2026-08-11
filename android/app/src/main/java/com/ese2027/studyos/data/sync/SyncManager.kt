package com.ese2027.studyos.data.sync

import com.ese2027.studyos.data.local.AppDatabase
import com.ese2027.studyos.data.local.SyncQueue
import com.ese2027.studyos.data.remote.SupabaseService
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SyncManager(
    private val database: AppDatabase,
    private val supabase: SupabaseService
) {
    private val gson = Gson()

    suspend fun enqueueMutation(entityType: String, entityId: String, operation: String, payloadObj: Any) {
        withContext(Dispatchers.IO) {
            val jsonPayload = gson.toJson(payloadObj)
            database.syncQueueDao().insert(
                SyncQueue(
                    entityType = entityType,
                    entityId = entityId,
                    operation = operation,
                    payload = jsonPayload,
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

            // 1. Upload the outbox before deleting it. The previous code deleted
            // every item without making a Supabase request, silently losing data.
            val pending = database.syncQueueDao().getPending()
            var processedCount = 0

            if (pending.isNotEmpty()) {
                val mutations = pending.map { item ->
                    mapOf(
                        "entity_type" to item.entityType,
                        "entity_id" to item.entityId,
                        "operation" to item.operation,
                        "payload" to gson.fromJson(item.payload, Any::class.java),
                        "created_at" to item.createdAt
                    )
                }
                val upload = supabase.uploadUserProgress(
                    userId,
                    mapOf("pending_mutations" to mutations, "updated_at" to System.currentTimeMillis())
                )
                if (upload.isFailure) {
                    pending.forEach { item ->
                        database.syncQueueDao().incrementRetry(item.id, upload.exceptionOrNull()?.message ?: "Sync error")
                    }
                    return@withContext Result.failure(upload.exceptionOrNull() ?: IllegalStateException("Sync failed"))
                }
                pending.forEach { item -> database.syncQueueDao().delete(item.id) }
                processedCount = pending.size
            }

            // 2. Download remote user_progress backup
            val remoteResult = supabase.downloadUserProgress(userId)
            remoteResult.getOrNull()?.let { remoteMap ->
                // Apply cloud changes if newer
            }

            Result.success(processedCount)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
