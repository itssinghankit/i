package com.itssinghankit.i

import android.app.Application
import com.itssinghankit.i.di.AppContainer

/** App entry point. Builds the [AppContainer] once; everything else gets its dependencies from it. */
class IApplication : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
