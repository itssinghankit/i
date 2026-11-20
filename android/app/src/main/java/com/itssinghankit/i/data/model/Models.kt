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
    /** Routine tab's bar: share of today's routine done (worked out here too, so an instant tick can update it). */
    val routinePercent get() = if (routine.isEmpty()) 0 else Math.round(routineDone * 100f / routine.size)
    /** To-do tab's bar: share of today's to-dos done. */
    val todoPercent get() = if (todos.isEmpty()) 0 else Math.round((todos.size - todosLeft) * 100f / todos.size)

    /** The same snapshot with some rows flipped (ticks tapped on the widget that the server hasn't confirmed yet). */
    fun withFlips(flips: Map<String, Boolean>): TodaySnapshot = if (flips.isEmpty()) this else copy(
        routine = routine.map { r -> flips[r.id]?.let { r.copy(done = it) } ?: r },
        todos = todos.map { t -> flips[t.id]?.let { t.copy(done = it) } ?: t },
    )
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
