# Spec: LumiFi

Read this when building or changing a v1 feature. It defines what to build now. Later versions live in `roadmap.md`. If something is not here or there, do not invent it; add an open question to `progress.md`.

## Overview
LumiFi is a calm lofi Pomodoro study app for students. It pairs a focus timer and relaxing sounds with light RPG progression (XP, levels, streaks, daily quests) so studying feels like building a habit. It runs as an Android app and a website from one codebase. The signature visual is light: on phones a candle (or small oil lamp) burns down as the session runs.

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
3. XP, level, streak and quest progress persist across restarts, and sync across devices once the user has an account (v2).
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
7. After the first completed session the app offers to save progress with an account (v2).

## Features
### Timer
- Modes: focus, short break, long break. Presets 25/5/15, 50/10/20, 90/20/30. Custom limits: focus 1 to 180, short 1 to 60, long 1 to 90 minutes.
- Every 4th completed focus session is followed by a long break, otherwise a short break.
- Optional auto-start of the next session.
- Reset and skip are allowed. Skipped or reset focus sessions earn nothing.
- Session end: no harsh beep. Flame dims, soft chime, notification (see `AGENTS.md`). "Later" leaves the next phase ready but not started.

### Tasks
- A simple daily task list: add, complete and choose an active task. Each task counts the focus sessions completed against it.
- Completing a task counts toward the daily task quest.
- No due dates, notes, subtasks or planner features in v1.

### Sound
- Music player with previous, next, play and pause, and volume. Only licensed or original tracks.
- Ambient mixer with independent volume: rain, cafe, fireplace, wind, clock ticking, brown noise, forest, keyboard and waves.
- Rain also appears visually on screen when its volume is above zero.
- Music at session end is a setting with three options: keep playing, lower the volume, or fade out and stop. Default: lower the volume. The soft chime plays either way, so a missed screen still gets a second cue.

### Session-end messages
- A short encouraging line shown when a focus session completes, chosen at random from a bundled list. Start with "Keep up the good work!", "You made it!" and "Good job!". Add more later.
- Static strings, no network. Nothing is shown for skipped or reset sessions.

### Progression
- XP: 2 XP per completed focus minute. Breaks earn nothing.
- Levels: level 1 needs 100 XP, each next level needs 50 more than the last. Names: Novice, Apprentice, Lamplighter, Scholar, Sage, Archmage (cap at the last).
- Streak: +1 the first time a focus session completes on a new calendar day. A missed day resets it.
- Daily quests, reset at local midnight, each rewarded once: finish 4 focus sessions (+40 XP), study 60 minutes (+50 XP), complete 1 task (+30 XP).
- Stats: minutes today, sessions today, total XP, minutes per day for the last 7 days. Store minutes per day without deleting old days, so the v2 calendar has history.

### Look and feel
- Phone: candle timer with a draggable bottom sheet for controls, tasks, sounds, quests, stats and settings. Four small candles show sessions toward a long break.
- Tablet: split view with the timer on one side and tasks, sounds and quests on the other.
- Desktop web: full-screen atmospheric scene, very large thin timer, icon dock, floating panels.
- Moods change the palette (see `ui.md`). The interface fades during a focus session and returns on touch, which the user can turn off.

## Scope
### In scope (v1)
Timer, tasks, music and the full ambient mixer (rain, cafe, fireplace, wind, clock ticking, brown noise, forest, keyboard and waves), moods, focus fade, gentle session end, session-end messages, music-at-end setting, local storage, session-end notification, Android and web.

### Planned after v1
Shipped one at a time from `roadmap.md`: accounts and sync, study pets, unlocks, goal-linked quests, calendar stats, achievements, your own music files (v2); streaming playlists, private circles, focus rooms, optional cosmetics (v3).

### Out of scope for v1
- Focus rooms, chat, friends and leaderboards (v3). Rooms need users, moderation and a community first.
- Pets, unlocks, goals, calendar view (v2).
- iOS release, app blocking, flashcards, planners, notes, Spotify or YouTube integration, extra languages.
- Ads, tracking SDKs, payments, and any paywall on the core timer.
- A separate marketing site.

## Success criteria
1. A fresh install can run a full focus session with no account and award the correct XP.
2. After backgrounding the app for the whole session, reopening shows the correct remaining time or the completed state, and the notification fired at `endAt`.
3. Killing and reopening the app keeps XP, streak, tasks and settings.
4. The three layouts render correctly at 360, 768 and 1280 px widths.
5. Music keeps playing with the screen off on a physical Android device.
6. Core progression functions have unit tests covering midnight, skipped days and quest rewards.
7. When a focus session ends with music playing, the music keeps playing, lowers, or fades out as the setting says, and the chime still plays.
8. A completed focus session shows an encouraging message. A skipped or reset one shows none.
9. The clock ticking loop plays in the ambient mixer with its own volume, and keeps playing with the screen off.
