package com.ese2027.studyos.data.repository

import com.ese2027.studyos.data.remote.SupabaseService
import kotlinx.coroutines.flow.Flow

sealed class AuthState {
    data object Loading : AuthState()
    data class Authenticated(val userId: String, val email: String?) : AuthState()
    data object Unauthenticated : AuthState()
}

class AuthRepository(
    private val supabase: SupabaseService
) {

    fun getUserId(): String {
        return supabase.getCurrentUserId() ?: "local_user"
    }

    fun isUserLoggedIn(): Boolean {
        return supabase.isLoggedIn()
    }

    fun getCurrentAuthState(): AuthState {
        val userId = supabase.getCurrentUserId()
        return if (userId != null) {
            AuthState.Authenticated(userId, supabase.getCurrentUserEmail())
        } else {
            AuthState.Unauthenticated
        }
    }

    suspend fun signIn(email: String, password: String): Result<Unit> {
        return supabase.signIn(email, password)
    }

    suspend fun signUp(email: String, password: String): Result<Unit> {
        return supabase.signUp(email, password)
    }

    suspend fun signOut(): Result<Unit> {
        return supabase.signOut()
    }
}
