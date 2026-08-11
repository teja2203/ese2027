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
            client.from("user_progress")
                .upsert(
                    mapOf(
                        "user_id" to userId,
                        "data" to dataMap,
                        "updated_at" to System.currentTimeMillis()
                    )
                )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun downloadUserProgress(userId: String): Result<Map<String, Any?>?> {
        return try {
            val result = client.from("user_progress")
                .select(columns = Columns.ALL) {
                    filter {
                        eq("user_id", userId)
                    }
                }
                .decodeSingleOrNull<Map<String, Any?>>()

            @Suppress("UNCHECKED_CAST")
            val data = result?.get("data") as? Map<String, Any?>
            Result.success(data)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
