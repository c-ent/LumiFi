# Architecture

Read this when changing data flow, storage, auth, or folder boundaries. Only what the code cannot show on its own.

## Folder boundaries
- `app/`: Expo Router routes only. Thin files that render a screen from `components/lumifi`.
- `src/core/`: pure logic (deadline math, phase cycle, XP, levels, streaks, quests). No React, React Native, Expo or Supabase imports.
- `src/theme/`: shared color, font and radius tokens. No React. Screens read these instead of hardcoding colors.
- `src/data/`: the only place that talks to Supabase.
- `assets/audio/`: licensed tracks only, listed in `MUSIC_LICENSES.md`.

### `components/lumifi/` is grouped by feature
- Root: `lumifi-screen.tsx` (the public entry `app/` imports), `logic.tsx` (the provider and context), `theme.ts` (scene and mood palettes, `PRESETS`, `formatTime`, and a re-export barrel for `src/theme/tokens` and five `src/core` modules).
- `screens/`: `mobile.tsx`, `tablet.tsx`, `desktop.tsx`. The device shells. Arrangement only, no business rules. Each is a thin composition of the feature panels.
- `features/`: one folder per product concept. `layout.ts`, `tone.ts`, `background/`, `clock/`, `timer/`, `tasks/`, `audio/`, `progression/`, `settings/`. A feature owns its own components; device differences are a `mobile` prop (or the shell), not a separate folder.
- `shared/`: `icons.tsx`, `panel-heading.tsx`, `panel-styles.ts`. Cross-layout UI. `panel-styles.ts` is the one `StyleSheet` the feature panels share.
- `hooks/`: `use-ambient`, `use-background-audio`, `use-music`, `use-session-clock`. Kept together rather than scattered per feature.
- `domain/`: `saved-state.ts`, `session.ts`, `notifications.ts`, `storage.ts`. Non-UI: persistence, scheduling, and pure re-exports.

### Layout switching is dimension-driven
`features/layout.ts` holds the only breakpoint logic (`PHONE_MAX_WIDTH` 600, `TABLET_MAX_WIDTH` 840, `layoutForWidth`, `layoutForWindow`). It is **not** in `theme.ts`.

The check is dimensions, never device model: an iPad in portrait (shorter side 768-834) gets the tablet layout, and an iPad Pro in landscape (shorter side 1024) gets the desktop scene because 1024 is past 840. So "tablet" is a width band, not "iPad". Android is the only verified target; iOS is untested.

## Storage model
- Device (AsyncStorage through Zustand persist): tasks, settings, XP, streak, daily quest progress, the current session. Local-first, so the app works with no account.
- Supabase Postgres (v2, planned): profile with XP, level and streak; tasks; completed focus sessions; quest claims; later pets owned and goals. Every row belongs to one user.
- Daily minutes: keep one total per day on the device without pruning, so the v2 calendar has history.
- Audio files: bundled in `assets/audio` for v1. Do not store audio in database rows. Streaming is an open question.

## Auth and access
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
- One local notification on the `session-end` channel, scheduled at `endAt` with `delivery: 'alarmClock'` and `USE_EXACT_ALARM`. Why: LumiFi is a timer, and Google Play allows that permission for timer apps. `bestEffort` can be deferred by minutes on some Android builds. Date: 2026-11-02
