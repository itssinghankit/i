package com.itssinghankit.i.di

import android.content.Context
import com.itssinghankit.i.BuildConfig
import com.itssinghankit.i.IApplication
import com.itssinghankit.i.data.local.SessionStore
import com.itssinghankit.i.data.remote.ApiClient
import com.itssinghankit.i.data.remote.ReleasesApi
import com.itssinghankit.i.data.repository.SessionRepository
import com.itssinghankit.i.data.repository.TodayRepository
import com.itssinghankit.i.data.repository.UpdateRepository

/**
 * Manual dependency injection: one place that creates and wires the app's objects.
 * Swap an implementation here (e.g. a fake ApiClient in tests) without touching the screens.
 */
class AppContainer(context: Context) {
    private val app = context.applicationContext
    val baseUrl: String = BuildConfig.APP_URL

    val sessionRepository by lazy { SessionRepository(SessionStore(app)) }
    private val apiClient by lazy { ApiClient(baseUrl) { sessionRepository.token() } }
    val todayRepository by lazy { TodayRepository(apiClient) }
    val updateRepository by lazy { UpdateRepository(ReleasesApi(BuildConfig.GITHUB_REPO), BuildConfig.VERSION_NAME) }
}

/** Shortcut: context.container */
val Context.container: AppContainer get() = (applicationContext as IApplication).container
