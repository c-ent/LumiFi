# Architecture

Read this when changing data flow, storage, auth, or folder boundaries. Only what the code cannot show on its own.

## Folder boundaries
- `app/`: Expo Router routes only. Thin files that render a screen from `components/wickglow`.
- `src/core/`: pure logic (deadline math, phase cycle, XP, levels, streaks, quests, own-track playlist math, streaming-link parsing, which player owns the sound in `music-source.ts`, the ambient sound list in `ambient.ts`, what the timer shows around the time in `session-face.ts`, the timer limits and cycle length in `phase.ts`). No React, React Native, Expo or Supabase imports.
- `src/theme/`: shared color, font and radius tokens. No React. Screens read these instead of hardcoding colors.
- `src/data/`: does not exist yet. It is reserved as the only place that would talk to Supabase. Accounts and sync were dropped from the plan on 2026-11-10, so there is no Supabase client in the app.
- `assets/audio/`: licensed tracks only, listed in `MUSIC_LICENSES.md`.
- `assets/backgrounds/`: background videos, listed in `BACKGROUND_LICENSES.md`. Not all cleared yet; see that file's Status notes before wiring a new file into a scene picker.

### `components/wickglow/` is grouped by feature

- Root: `wickglow-screen.tsx` (the public entry `app/` imports), `logic.tsx` (the provider and context), `theme.ts` (scene and mood palettes, `PRESETS`, `formatTime`, and a re-export barrel for `src/theme/tokens` and six `src/core` modules).
- `screens/`: `mobile.tsx`, `tablet.tsx`, `desktop.tsx`. The device shells. Arrangement only, no business rules. Each is a thin composition of the feature panels. The start label, cycle line, pips and focus chip come from `sessionFace` (`src/core/session-face.ts`) and zen from `hooks/use-zen.ts`; a shell does not compute them itself.
- `features/`: one folder per product concept. `layout.ts`, `tone.ts`, `background/`, `clock/`, `timer/`, `tasks/`, `audio/`, `progression/`, `settings/`. A feature owns its own components; device differences are a `mobile` prop (or the shell), not a separate folder.
- `shared/`: `icons.tsx`, `panel-heading.tsx`, `panel-styles.ts`. Cross-layout UI. `panel-styles.ts` is the one `StyleSheet` the feature panels share.
- `hooks/`: `use-ambient`, `use-background-audio`, `use-music`, `use-session-clock`, `use-zen`. Kept together rather than scattered per feature.
- `domain/`: `saved-state.ts`, `saved-store.ts`, `save-queue.ts`, `session-run.ts`, `notifications.ts`, `storage.ts`, `own-music.ts`, `preload-track.ts` (plus `preload-track.web.ts`, its web sibling, which must keep the same basename), `silence-ambient.ts`, `stream-check.ts`. Non-UI: persistence, scheduling, file picking and copying, and platform wrappers. Code outside `components/` imports `src/core` directly. Tests sit beside their file (`*.test.ts`).

### session.ts is the reward path

`completeSession` in `src/core/session.ts` is the one path for a finished focus. It pays 2 XP per minute, adds the minutes, and, when the session is at least `SESSION_REWARD_MINUTES` (10) from `src/core/xp.ts`, counts one session and updates the streak. Quest payouts stay in `quests.ts`. No component computes XP. Goals were removed on 2026-11-04.

### Layout switching is dimension-driven
`features/layout.ts` holds the only breakpoint logic (`PHONE_MAX_WIDTH` 600, `TABLET_MAX_WIDTH` 840, `layoutForWidth`, `layoutForWindow`). It is **not** in `theme.ts`.

The check is dimensions, never device model: an iPad in portrait (shorter side 768-834) gets the tablet layout, and an iPad Pro in landscape (shorter side 1024) gets the desktop scene because 1024 is past 840. So "tablet" is a width band, not "iPad". Android is the only verified target; iOS is untested.

### Two contexts, and actions that never change

`logic.tsx` provides two contexts. `useWickglow()` is the state and the actions; its value is memoised and changes only when something on screen changes. `useWickglowClock()` is the countdown (`remaining`, `progress`), which changes every second while a session runs. Only `TimeText` and `SessionCandle` read the clock. Do not read it in a screen shell or a panel, or that whole component re-renders every second.

Every action from `useWickglow()` keeps one identity for the life of the provider (`useStableActions`). A new action must be added to `WickglowActions` and to `ACTION_NAMES`; the compiler refuses the build if the second is forgotten. Destructure actions at the top of a component rather than calling `lamp.action()`.

## Storage model
- Device (AsyncStorage, one JSON value under `wickglow:state`): tasks, settings, XP, streak, daily quest progress, the current session. This is the only storage the app has. There is no Zustand; the provider in `logic.tsx` holds the state.
- Writing: `domain/saved-store.ts` holds the newest state and is the only thing that changes it. The provider reads it with `useSyncExternalStore`. `store.commit` writes at once (timer changes). `store.update` is written by `domain/save-queue.ts` 300 ms after the last change, and at once when the app leaves the foreground.
- Timer changes: `domain/session-run.ts` owns start, pause, reset, skip, mode and length changes, and the session end. It is the only caller of `scheduleSessionEnd` and `cancelSessionEnd`, which is how the one-alarm rule in `AGENTS.md` is kept. It takes the alarm, the music, the time and the screen effects as arguments, so its tests run it without a device. A new timer action goes there, not in `logic.tsx`.
- Music source: `src/core/music-source.ts` decides whether the local player, an embed or another app owns the sound. `logic.tsx` sends it events (`sendSource`) and carries out the pause or play it returns.
- Reading: `parseSavedState` checks every field and builds the state from the known fields only, so an unknown key is dropped.
- Supabase Postgres (not built; dropped from the plan 2026-11-10): profile with XP, level and streak; tasks; completed focus sessions; quest claims. Every row belongs to one user.
- Daily minutes: keep one total per day on the device without pruning, so the calendar has history. The month grid reads that history through `monthGrid` and stores nothing of its own; only the displayed month and the tapped day live in the panel's state.
- Audio files: bundled in `assets/audio` for v1. The user's own files are copied into the app's private document folder (`Paths.document/own-tracks`) and only their id, title and `file://` URI are stored in AsyncStorage. A streaming link stores the public page URL and the service name in the same save. The audio stays in that service's player. Do not store audio in database rows, and do not copy a stream into a file.

## Auth and access
Not built. Accounts and sync were dropped from the plan on 2026-11-10. The rules below are kept for the day they come back.

- Authentication: Supabase Auth, optional. Session in AsyncStorage (evaluate `expo-secure-store` before release). Token auto refresh follows app state.
- Ownership: every row has a `user_id` equal to `auth.uid()`.
- Access control: RLS on every table, a user reads and writes only their own rows. XP, level, streak and quest rewards change only through server functions that validate the input.

## Invariants
Check these before finishing a task. Timer, notification, audio and navigation rules are in `AGENTS.md`.
1. `src/core` imports nothing from React, React Native, Expo or Supabase.
2. Layout components contain no business rules.
3. Every Supabase table has RLS enabled.
4. Only `src/data` calls Supabase.

## Decisions and why
- Supabase over Firebase. Why: Postgres functions and RLS allow server-validated XP on the free plan, Firebase Cloud Functions need the paid plan. Date: 2026-11-01
- Expo SDK 58 with Expo Router. Why: stable since mid October 2026, and the app uses few third-party native libraries. Date: 2026-11-01
- Timestamp timer with a scheduled notification, no custom foreground service. Why: a foreground service is the wrong Android tool for a countdown. Date: 2026-11-01
- One local notification on the `session-end` channel, scheduled at `endAt` with `delivery: 'alarmClock'` and `USE_EXACT_ALARM`. Why: Wickglow is a timer, and Google Play allows that permission for timer apps. `bestEffort` can be deferred by minutes on some Android builds. Date: 2026-11-02
