# Spec: LumiFi

Read this when building or changing a v1 feature. It defines what to build now. Later versions live in `roadmap.md`. If something is not here or there, do not invent it; add an open question to `progress.md`.

## Overview
LumiFi is a calm lofi Pomodoro study app for students. It pairs a focus timer and relaxing sounds with light RPG progression (XP, levels, streaks, daily quests) so studying feels like building a habit. It runs as an Android app and a website from one codebase. The signature visual is light: on phones a candle burns down as the session runs.

## Product principles
From competitor research (evidence in `roadmap.md`). Check new work against these.
1. Do one thing well. Build the focus timer, sounds and progression. Do not add notes, a planner or flashcards.
2. Be reliable on Android first. The timer survives a locked screen and notifies on time.
3. End sessions gently. Dim the flame and play a soft chime. Do not use a harsh alarm.
4. Keep the core free. Timer, tasks, sounds and progression stay free. Any later payment is optional cosmetics or a one-time purchase.
5. Work offline. v1 is local-first with bundled audio.
6. Have an identity. Use original or commissioned lofi, and your own name, art and music.

## Goals
1. A user can start a focus session within two taps of opening the app, with no account.
2. The time shown is always correct after any period in the background, and a notification fires at the session end on a physical Android device.
3. XP, level, streak and quest progress persist across restarts, and sync across devices once the user has an account (v4, last).
4. One codebase renders three layouts (phone, tablet, desktop web) from window width.
5. Music and ambient sounds keep playing with the screen off.
6. A session ends gently and motivates: the flame dims, a soft chime plays, a short encouraging message shows, and the music does what the user chose.

## Core user flow
1. User opens the app. No sign-in is required.
2. User optionally adds a task and chooses it as the active task.
3. User taps the candle (or "Light the candle") to start a focus session. A session-end notification is scheduled and the interface fades after a few seconds.
4. The candle burns down. Music and ambient sounds play if enabled.
5. The session ends: the flame dims softly, a soft chime plays, the notification fires, XP is awarded and quest progress updates. A short encouraging message shows with "Start break" and "Later". The next candle (break) is ready.
6. After every 4th focus session the break is a long break.

## Features
### Timer
- Modes: focus, short break, long break. Presets 25/5/15, 50/10/20, 90/20/30. Custom limits: focus 1 to 180, short 1 to 60, long 1 to 90 minutes.
- Every 4th completed focus session is followed by a long break, otherwise a short break.
- Optional auto-start of the next session.
- Reset and skip are allowed. Skipped or reset focus sessions earn nothing.
- Session end: no harsh beep. Flame dims, soft chime, notification (see `AGENTS.md`). "Later" leaves the next phase ready but not started.

### Tasks
- A task list: add a task, give it an optional due date, complete it, edit its title, delete it, and choose it as the active task. Choosing the active task again clears it. Finished tasks sit under the open ones.
- A task can hold subtasks. Checking the task checks its subtasks. Checking the last open subtask checks the task, and adding a subtask to a finished task opens that task again. Deleting a task deletes its subtasks.
- Each task counts the focus sessions completed against it. Only the task itself counts toward the daily task quest, once, including when its subtasks finish it. A subtask does not count on its own.
- A due date is a local calendar day. A date before today reads as overdue. It does not change XP, the streak, or the daily quests.
- No notes or planner.

### Sound
- Music player with previous, next, play and pause, a repeat toggle, and volume. Only licensed or original tracks. The repeat toggle loops the current track until it is turned off; with it off, a finished track advances to the next one. The setting persists.
- The user can add their own audio files from the device. They join the playlist after the bundled tracks, stay on the device, are never uploaded, play offline, and are skipped if the file is gone. Adding own files is Android and iOS only; the web build says so in place of the button.
- Ambient mixer with independent volume: rain, cafe, fireplace, wind, clock ticking, brown noise, forest, keyboard and waves.
- Rain also appears visually on screen when its volume is above zero.
- Music at session end is a setting with three options: keep playing, lower the volume, or fade out and stop. Default: lower the volume. The soft chime plays either way, so a missed screen still gets a second cue. This applies to the bundled tracks and the user's own files. It does not change a streaming embed.
- The user can paste a public Spotify, YouTube, YouTube Music, or Apple Music link. LumiFi stores the link and the service name and shows that service's own player. On the phone and tablet the music panel has two tabs, Tracks and Streaming. On the desktop, Music opens as a wide centered card of fixed height: now playing and the track list on the left, with the playlist scrolling inside its own box, and the paste field, saved links, and embed filling the right column. While that card is open the scene player hides and the same embed sits in the card. Adding a link opens that player immediately, including a link that was already saved. Closing the music panel, clicking outside it, or opening another panel puts the player back on the scene and leaves it playing. Switching between Tracks and Streaming on the phone or tablet does the same. The same frame stays mounted, so there is no way to collapse or shrink the player: it always shows at its default height, Spotify at 352 (152 for a track), YouTube at 270, and Apple Music at 450, with the service name, the title, and End stream. The head leads with that service's artwork from assets/images/icons — Spotify, YouTube, and Apple Music — at the left of the service name. The control is named End stream rather than Close because it stops playback: it unmounts the embed, and it can resume the local player. On the web, Spotify and Apple Music keep playing when the browser tab is hidden or the window is minimized. YouTube's frame is removed until the page is visible again. The audio never enters the local player. Starting the embed pauses the local player, and closing the player can resume it. Playing or choosing a local track stops the stream, so only one plays at a time. There is no Spotify, Google, or Apple sign-in built by LumiFi, and no playback SDK. A private or unrecognized link fails with a short message. A YouTube playlist stays in a visible player and stops when the app leaves the screen. A YouTube Music link is stored and opened, and it is not embedded. Signed out, Spotify and Apple Music play a short preview. If an embed cannot play on Android, the link opens in that service's app. Screen-off playback stays with the bundled tracks and the user's own files. A focus session during an embed still completes, grants XP, and counts for quests. Nothing from the stream is saved for offline play.

### Session-end messages
- A short encouraging line shown when a focus session completes, chosen at random from a bundled list. Start with "Keep up the good work!", "You made it!" and "Good job!". Add more later.
- Static strings, no network. Nothing is shown for skipped or reset sessions.

### Progression
- XP: 2 XP per completed focus minute, including a session shorter than 10 minutes. Breaks earn nothing. There is no daily cap.
- Levels: level 1 needs 100 XP, each next level needs 50 more than the last. Names: Novice, Apprentice, Lamplighter, Scholar, Sage, Archmage (cap at the last).
- Streak: +1 the first time a focus session of at least 10 minutes completes on a new calendar day. A shorter session does not start or keep it. A missed day resets it.
- Daily quests, reset at local midnight, each rewarded once: finish 4 focus sessions of at least 10 minutes (+40 XP), study 60 minutes (+50 XP), complete 1 task (+30 XP). Minutes from a shorter session still count toward the 60. A shorter session does not count toward the 4.
- Stats: minutes today, sessions today, total XP, minutes per day for the last 7 days, and a month calendar. Store minutes per day without deleting old days, so the calendar has history.
- Calendar stats: a six-week month grid beside the 7-day chart, built by `monthGrid` in `src/core/month-calendar.ts`. Every day is a cell, so a day with no history is a gap with zero minutes rather than a missing cell, and the first and last weeks are padded with the adjacent months at reduced opacity. Each day is shaded in four steps from `monthShade`: nothing, 1 to 24, 25 to 59, and 60 minutes or more, the deepest step in the layout accent. Tapping a day shows that day's minutes and sessions; today is marked, and the streak sits in the month header with the month's own total under the grid. The arrows change only the displayed month, and a different month shows no today marker. A day after today has no focus time yet, so it is dimmed, its `future` flag comes from the core, and it is not pickable; the next arrow stops at the current month for the same reason. The grid takes `now` and reads the stored history, so it never counts a padding day, and the detail line is derived from the same cell the tap came from rather than a second copy. Picking a day with no focus time shows one quiet line from `QUIET_DAY_LINES` in place of the zero reading, chosen by `quietDayLine` and redrawn on every tap, so a month of gaps does not read as one sentence repeated. The month total and the accessibility label keep the plain reading, since those are the places that read as numbers.

### Look and feel
- Phone: candle timer with a draggable bottom sheet for controls, tasks, sounds, quests, stats and settings. Four small candles show sessions toward a long break.
- Tablet: split view with the timer on one side and tasks, sounds, quests and the month calendar on the other.
- Desktop web: full-screen atmospheric scene, very large thin timer, icon dock. Music, Progress, Quests and Tasks are each a centered card. The mixer and scenes stay a narrow card on the left, and timer settings is the same narrow card on the right.
- Tasks are one list on every layout: the phone Tasks tab, the tablet tasks block, and a centered Tasks card on desktop about 470 wide. The list is an add field with an optional due date, then each task with its checkbox, title, due date, subtasks, edit, and delete. Daily quests stay on the Quests surface.
- Moods change the palette (see `ui.md`). The interface fades during a focus session and returns on touch, which the user can turn off.

## Scope
### In scope (v1, plus shipped v2 music)
Timer, tasks, music and the full ambient mixer (rain, cafe, fireplace, wind, clock ticking, brown noise, forest, keyboard and waves), the user's own audio files, public streaming links played in each service's own player, moods, focus fade, gentle session end, session-end messages, music-at-end setting, local storage, session-end notification, Android and web.

### Planned after v1
Shipped one at a time from `roadmap.md`: your own music files, streaming playlists, and calendar stats (v2, shipped). Goal-linked quests shipped and were removed on 2026-11-04. Accounts and sync, private circles, and focus rooms are last (v4). Study pets and achievements are out.

### Out of scope for v1
- Focus rooms, chat, friends and leaderboards (v4). Rooms need users, moderation and a community first.
- Study pets and achievements are out. Goal-linked quests were removed. The calendar view is v2.
- A coin currency, loot boxes, or paid cosmetics.
- iOS release, app blocking, flashcards, planners, notes, a Spotify, Google, or Apple sign-in or playback SDK, extra languages.
- Ads, tracking SDKs, payments, and any paywall on the core timer.
- A marketing site inside this app. The site is a separate static project (Astro or plain HTML) for the pitch, store links, and the privacy policy. The Expo web build is the app, not that site.

## Success criteria
1. A fresh install can run a full focus session with no account and award the correct XP.
2. After backgrounding the app for the whole session, reopening shows the correct remaining time or the completed state, and the notification fired at `endAt`.
3. Killing and reopening the app keeps XP, streak, tasks and settings.
4. The three layouts render correctly at 360, 768 and 1280 px widths.
5. Music keeps playing with the screen off on a physical Android device.
6. Core progression functions have unit tests covering midnight, skipped days, quest rewards, a task completed with its subtasks, and a due date before and after today.
7. When a focus session ends with music playing, the music keeps playing, lowers, or fades out as the setting says, and the chime still plays.
8. A completed focus session shows an encouraging message. A skipped or reset one shows none.
9. The clock ticking loop plays in the ambient mixer with its own volume, and keeps playing with the screen off.
10. The user's own audio files survive a restart, play offline with the screen off, and a file deleted outside the app is skipped without a crash.
