package com.itssinghankit.i.ui.main

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.itssinghankit.i.BuildConfig
import com.itssinghankit.i.data.model.UpdateInfo
import com.itssinghankit.i.data.repository.SessionRepository
import com.itssinghankit.i.data.repository.UpdateRepository
import com.itssinghankit.i.di.container
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** What the screen should show. The Activity only draws this; all decisions are made here. */
data class MainUiState(
    val load: LoadRequest? = null,      // load this URL (id changes = load again)
    val error: LoadError? = null,       // show the "Can't open i" page
    val pageReady: Boolean = false,     // splash may go away
    val update: UpdateInfo? = null,     // offer "New version …"
)
data class LoadRequest(val id: Long, val url: String)
data class LoadError(val url: String, val reason: String)

/**
 * Main screen logic:
 *  - loads the web app and runs the load watchdog (reload a stalled first load up to MAX_RELOADS times,
 *    then show an error with Retry),
 *  - checks GitHub for a newer APK (release builds only),
 *  - keeps the widget's login token in sync.
 */
class MainViewModel(
    private val baseUrl: String,
    private val session: SessionRepository,
    private val updates: UpdateRepository,
    private val isDebug: Boolean,
) : ViewModel() {

    private val _state = MutableStateFlow(MainUiState())
    val state: StateFlow<MainUiState> = _state.asStateFlow()

    /** Ask the View to check whether the page has drawn (it owns the WebView). */
    private val _bootChecks = MutableSharedFlow<Long>(extraBufferCapacity = 4)
    val bootChecks: SharedFlow<Long> = _bootChecks

    /** Routes for the page (e.g. "add-todo" from the widget's +). Sent only once the page has loaded. */
    private val _routes = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val routes: SharedFlow<String> = _routes
    private var appPageLoaded = false
    private var pendingRoute: String? = null

    private var attempts = 0
    private var nextId = 1L
    private var watchdog: Job? = null

    init {
        if (!isDebug) viewModelScope.launch {
            val info = withContext(Dispatchers.IO) { runCatching { updates.newerVersion() }.getOrNull() }
            _state.value = _state.value.copy(update = info)
        }
    }

    fun start(route: String?) { if (_state.value.load == null) load(urlFor(route)) }
    fun retry() { attempts = 0; load(urlFor(null)) }
    fun urlFor(route: String?) = if (route != null) "$baseUrl/#$route" else baseUrl

    private fun load(url: String) {
        appPageLoaded = false
        attempts++
        val id = nextId++
        _state.value = _state.value.copy(load = LoadRequest(id, url), error = null)
        watchdog?.cancel()
        watchdog = viewModelScope.launch {
            delay(WATCHDOG_MS)
            _bootChecks.emit(id)
            delay(CHECK_TIMEOUT_MS)            // no answer at all = page is stuck
            onBootResult(id, booted = false)
        }
    }

    /** The View reports whether the page has drawn something into #root. */
    fun onBootResult(id: Long, booted: Boolean) {
        val current = _state.value.load ?: return
        if (id != current.id || _state.value.error != null) return
        watchdog?.cancel()
        if (booted) return
        if (attempts <= MAX_RELOADS) load(current.url)
        else showError(current.url, "The app took too long to load.")
    }

    /**
     * The app's own page finished loading. A route that arrived earlier is sent now: when the app was closed,
     * Android restarts it first and hands over the widget's request before the page exists, so it used to be lost.
     */
    fun onPageFinished(isAppPage: Boolean) {
        _state.value = _state.value.copy(pageReady = true)
        if (!isAppPage) return
        appPageLoaded = true
        pendingRoute?.let { pendingRoute = null; _routes.tryEmit(it) }
    }

    /** A widget tap while the app already exists (onNewIntent). */
    fun openRoute(route: String) {
        if (appPageLoaded) _routes.tryEmit(route) else pendingRoute = route
    }

    fun onLoadFailed(url: String, reason: String) = showError(url, reason)

    private fun showError(url: String, reason: String) {
        watchdog?.cancel()
        _state.value = _state.value.copy(error = LoadError(url, reason), pageReady = true)
    }

    /** Debug builds: show the update sheet with sample data, to check how it looks. */
    fun previewUpdate() {
        _state.value = _state.value.copy(update = UpdateInfo(
            version = "1.0.3", currentVersion = BuildConfig.VERSION_NAME, downloadUrl = "https://github.com/itssinghankit/i/releases",
            notes = listOf("New Learnings tab with your own categories", "Widget: Routine and To-do tabs", "Smoother tab switching"),
            sizeBytes = 4_640_175,
        ))
    }

    fun updateShown() { _state.value = _state.value.copy(update = null) }

    // ---- session (login token for the widget) ----
    fun saveSession(token: String) = session.save(token)
    fun clearSession() = session.clear()

    companion object {
        const val WATCHDOG_MS = 6000L
        const val CHECK_TIMEOUT_MS = 2500L
        const val MAX_RELOADS = 2

        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app = this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY]!!
                val c = app.container
                MainViewModel(c.baseUrl, c.sessionRepository, c.updateRepository, BuildConfig.DEBUG)
            }
        }
    }
}
