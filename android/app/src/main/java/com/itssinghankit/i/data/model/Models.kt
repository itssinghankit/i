package com.itssinghankit.i.data.model

/** What the home-screen widget shows for today. */
data class TodaySnapshot(
    val date: String,
    val percent: Int,
    val routine: List<TodayItem>,
    val todos: List<TodayItem>,
) {
    val routineDone get() = routine.count { it.done }
    val todosLeft get() = todos.count { !it.done }
}

/** One routine item or to-do. kind = "routine" | "todo". color is #RRGGBB (routine only). */
data class TodayItem(
    val kind: String,
    val id: String,
    val title: String,
    val emoji: String,
    val minutes: Int,
    val color: String?,
    val done: Boolean,
)

/** A newer app version on GitHub Releases. notes = "What's new" lines; sizeBytes = APK size (0 if unknown). */
data class UpdateInfo(
    val version: String,
    val currentVersion: String,
    val downloadUrl: String,
    val notes: List<String> = emptyList(),
    val sizeBytes: Long = 0,
)
