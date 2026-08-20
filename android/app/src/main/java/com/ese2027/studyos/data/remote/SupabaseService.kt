package com.ese2027.studyos.data.remote

import com.ese2027.studyos.BuildConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.float
import kotlinx.serialization.json.floatOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull

/**
 * Shared Supabase client. supabase-kt's Auth must be initialised on the main
 * thread (it registers a lifecycle observer), so the singleton is created once
 * in StudyOsApplication.onCreate and reused everywhere — including from
 * background threads (services, WebView bridge, workers) where constructing it
 * would otherwise throw.
 */
class SupabaseService private constructor() {

    companion object {
        @Volatile
        private var INSTANCE: SupabaseService? = null

        fun getInstance(): SupabaseService {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: SupabaseService().also { INSTANCE = it }
            }
        }
    }

    val client: SupabaseClient = createSupabaseClient(
        supabaseUrl = BuildConfig.SUPABASE_URL,
        supabaseKey = BuildConfig.SUPABASE_ANON_KEY
    ) {
        install(Auth)
        install(Postgrest)
    }

    suspend fun signUp(email: String, password: String): Result<Unit> {
        return try {
            client.auth.signUpWith(Email) {
                this.email = email
                this.password = password
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signIn(email: String, password: String): Result<Unit> {
        return try {
            client.auth.signInWith(Email) {
                this.email = email
                this.password = password
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun signOut(): Result<Unit> {
        return try {
            client.auth.signOut()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Imports a session obtained elsewhere (the WebView's supabase-js client, which
     * the user signs into via the in-app form). The web and native clients SHOULD
     * share the same Supabase project; without bridging the session they each keep
     * their own SessionManager and the native side effectively appears anonymous.
     *
     * We feed it the access+refresh tokens the web client minted so the native
     * workers (SyncWorker) can upload to user-scoped tables. retrieveUser=true so
     * currentUserOrNull() returns the right identity immediately, and autoRefresh=true
     * so the SDK refreshes itself when the access token expires.
     */
    suspend fun importSession(accessToken: String, refreshToken: String): Result<Unit> {
        return try {
            if (accessToken.isBlank()) {
                Result.failure(IllegalArgumentException("access_token is blank"))
            } else {
                client.auth.importAuthToken(
                    accessToken = accessToken,
                    refreshToken = refreshToken,
                    retrieveUser = true,
                    autoRefresh = true
                )
                Result.success(Unit)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getCurrentUserId(): String? {
        return client.auth.currentUserOrNull()?.id
    }

    fun getCurrentUserEmail(): String? {
        return client.auth.currentUserOrNull()?.email
    }

    fun isLoggedIn(): Boolean {
        return client.auth.currentUserOrNull() != null
    }

    val authStatusFlow: Flow<Boolean> = client.auth.sessionStatus.map { status ->
        client.auth.currentUserOrNull() != null
    }

    suspend fun uploadUserProgress(userId: String, dataMap: Map<String, Any?>): Result<Unit> {
        return try {
            // Merge into the existing row instead of replacing it. The web app
            // owns user_progress.data — its full progress snapshot (checked
            // tasks, logs, pomo, habits…). A wholesale upsert here would
            // silently wipe that snapshot from the cloud every sync.
            val existing = downloadUserProgress(userId).getOrNull() ?: emptyMap()
            val merged = LinkedHashMap<String, Any?>()
            merged.putAll(existing)
            dataMap.forEach { (k, v) -> merged[k] = v }

            // Postgrest Kotlin 2.0.0's default serializer cannot handle
            // Map<String, Any?> ("Serializer for class 'Any' is not found"),
            // so we go through a JsonObject instead — kotlinx-serialization-json
            // natively serializes JsonObject without polymorphic resolution.
            val body = buildJsonObject {
                put("user_id", JsonPrimitive(userId))
                put("data", merged.toJsonObject())
                // user_progress.updated_at is timestamptz — Postgres rejects raw
                // epoch millis ("date/time field value out of range"), so send
                // an ISO-8601 UTC instant instead.
                put("updated_at", JsonPrimitive(java.time.Instant.now().toString()))
            }
            client.from("user_progress").upsert(body)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun downloadUserProgress(userId: String): Result<Map<String, Any?>?> {
        return try {
            val result: JsonObject? = client.from("user_progress")
                .select(columns = Columns.ALL) {
                    filter {
                        eq("user_id", userId)
                    }
                }
                .decodeSingleOrNull<JsonObject>()

            val dataEl = result?.get("data")
            val data = (dataEl as? JsonObject)?.toAnyMap()
            Result.success(data)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun uploadDomainMutation(
        userId: String,
        entityType: String,
        operation: String,
        payload: Map<String, Any?>
    ): Result<Unit> {
        return try {
            val table = domainTable(entityType)
            val normalized = LinkedHashMap(payload)
            normalized["user_id"] = userId
            if (operation == "DELETE" && normalized["deleted_at"] == null) {
                normalized["deleted_at"] = System.currentTimeMillis()
            }
            // See uploadUserProgress: Map<String, Any?> would throw "Serializer
            // for class 'Any' is not found" under Postgrest Kotlin 2.0.0's
            // default KotlinX serializer, so we serialize to a JsonObject first.
            client.from(table).upsert(normalized.toJsonObject())
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun downloadDomainRows(
        userId: String,
        entityType: String
    ): Result<List<Map<String, Any?>>> {
        return try {
            val rows = client.from(domainTable(entityType))
                .select(columns = Columns.ALL) {
                    filter { eq("user_id", userId) }
                }
                .decodeList<JsonObject>()
            Result.success(rows.map { it.toAnyMap() })
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun domainTable(entityType: String): String = when (entityType) {
        "plan" -> "plans"
        "study_block" -> "study_blocks"
        "focus_session" -> "focus_sessions"
        "notification" -> "in_app_notifications"
        else -> error("Unsupported domain entity: $entityType")
    }
}

/**
 * Recursive Map<String, Any?> -> JsonObject helper.
 *
 * Postgrest Kotlin 2.0.0 cannot serialize untyped `Map<String, Any?>` through its
 * default KotlinX serializer — `serializer(typeOf<Map<String, Any?>>())` requires a
 * serializer for `Any?`, which kotlinx-serialization does not provide. We bypass that
 * by materializing the map into a `JsonObject` (which kotlinx-serialization-json
 * natively understands), then passing it to `upsert(JsonObject)`.
 *
 * Supported value types: primitives (String/Number/Boolean/null), Map<String, Any?>,
 * Iterable<*>, array, JsonElement pass-through. Anything else falls back to its
 * toString() as a JsonPrimitive string — this only ever triggers for unexpected types.
 */
private fun Map<String, Any?>.toJsonObject(): JsonObject = buildJsonObject {
    forEach { (key, value) -> put(key, value.toJsonElement()) }
}

private fun JsonObject.toAnyMap(): Map<String, Any?> =
    entries.associate { (key, value) -> key to value.toAny() }

private fun JsonElement.toAny(): Any? = when (this) {
    is JsonNull -> null
    is JsonPrimitive -> when {
        isString -> content
        contentOrNull == null -> null
        booleanOrNull != null -> booleanOrNull
        intOrNull != null -> intOrNull
        longOrNull != null -> longOrNull
        doubleOrNull != null -> doubleOrNull
        floatOrNull != null -> floatOrNull
        else -> content
    }
    is JsonObject -> toAnyMap()
    is JsonArray -> map { it.toAny() }
}

private fun Any?.toJsonElement(): JsonElement = when (this) {
    null -> JsonNull
    is JsonElement -> this
    is String -> JsonPrimitive(this)
    is Boolean -> JsonPrimitive(this)
    is Int -> JsonPrimitive(this)
    is Long -> JsonPrimitive(this)
    // Gson deserializes payload numbers as Double (1 -> 1.0), which Postgres
    // integer/bigint columns reject ("invalid input syntax for type integer:
    // \"0.0\""). Emit whole-number doubles as Long so the JSON carries 1, not 1.0.
    is Float -> JsonPrimitive(if (this % 1.0f == 0.0f) toLong() else this)
    is Double -> JsonPrimitive(if (this % 1.0 == 0.0) toLong() else this)
    is Number -> JsonPrimitive(toString())
    is Map<*, *> -> {
        @Suppress("UNCHECKED_CAST")
        val typed: Map<String, Any?> = this as Map<String, Any?>
        typed.toJsonObject()
    }
    is Iterable<*> -> JsonArray(map { it.toJsonElement() })
    is Array<*> -> JsonArray(map { it.toJsonElement() })
    else -> JsonPrimitive(toString())
}
