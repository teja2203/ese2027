package com.ese2027.studyos.data.remote

import com.google.gson.annotations.SerializedName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

@Serializable
data class UserProgressDto(
    val user_id: String,
    val data: JsonObject,
    val updated_at: Long
)

data class SyncPayload(
    val entityType: String,
    val entityId: String,
    val operation: String,
    val data: Map<String, Any?>
)
