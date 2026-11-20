package com.itssinghankit.i.auth

import com.itssinghankit.i.BuildConfig

import android.app.Activity
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential

/**
 * Shows the phone's own "Sign in with Google" sheet and returns a Google ID token.
 * (Google does not allow its sign-in page inside a WebView, so this part has to be native.)
 * The token is made for our Web client ID, so the server checks it exactly like a web sign-in.
 */
object GoogleSignInClient {
    sealed class Result {
        data class Success(val idToken: String) : Result()
        data class Failure(val message: String) : Result()
        object Cancelled : Result()
    }

    suspend fun signIn(activity: Activity): Result {
        if (BuildConfig.GOOGLE_WEB_CLIENT_ID.isBlank()) {
            return Result.Failure("Google sign-in is not set up in this build (I_GOOGLE_WEB_CLIENT_ID is empty).")
        }
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_WEB_CLIENT_ID).build())
            .build()
        return try {
            val cred = CredentialManager.create(activity).getCredential(activity, request).credential
            if (cred is CustomCredential && cred.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                Result.Success(GoogleIdTokenCredential.createFrom(cred.data).idToken)
            } else Result.Failure("Unexpected sign-in response.")
        } catch (e: GetCredentialCancellationException) {
            Result.Cancelled
        } catch (e: NoCredentialException) {
            Result.Failure("No Google account found on this phone. Add one in Settings → Accounts.")
        } catch (e: GetCredentialException) {
            Result.Failure("Google sign-in failed: ${e.message ?: e.type}")
        }
    }

    /** Forgets which account was picked, so next time the account sheet shows again. */
    suspend fun signOut(activity: Activity) {
        try { CredentialManager.create(activity).clearCredentialState(androidx.credentials.ClearCredentialStateRequest()) } catch (_: Exception) {}
    }
}
