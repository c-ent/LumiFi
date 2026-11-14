# Wickglow developer guide

A walkthrough for people working on the Wickglow code. It explains how the parts fit together and where to make a change. The detailed rules live in the agent docs, and this guide links to them instead of repeating them.

| Doc | What it holds |
| --- | --- |
| [README.md](../README.md) | Requirements, setup and the command list |
| [AGENTS.md](../AGENTS.md) | Hard rules: timer, notifications, audio, env, boundaries |
| [agent/spec.md](agent/spec.md) | What every v1 feature does |
| [agent/architecture.md](agent/architecture.md) | Folder boundaries, storage model, sync, auth, invariants |
| [agent/conventions.md](agent/conventions.md) | Code conventions the linter can't enforce |
| [agent/ui.md](agent/ui.md) | Tokens, moods, typography, per-layout patterns |
| [agent/progress.md](agent/progress.md) | What is being built now, and open questions |
| [agent/roadmap.md](agent/roadmap.md) | Later work. Specs only, not permission to build |
| [feature/firebase.md](feature/firebase.md) | Accounts and sync: decisions, Firestore layout, read costs |
| [user-guide.md](user-guide.md) | The app from a user's point of view |

## Contents

- [Getting set up](#getting-set-up)
- [The shape of the code](#the-shape-of-the-code)
- [Following one focus session](#following-one-focus-session)
- [State and storage](#state-and-storage)
- [Accounts and sync](#accounts-and-sync)
- [Audio](#audio)
- [Layouts](#layouts)
- [Making a change](#making-a-change)
- [Testing](#testing)
- [Building and releasing](#building-and-releasing)
- [Pitfalls](#pitfalls)

## Getting set up

1. Use Node 22.13+, 24.3+ or 26. Odd-numbered versions are unsupported.
2. Run `npm install`.
3. Optional: create `.env` in the project root with the six `EXPO_PUBLIC_FIREBASE_*` values (see `src/data/firebase-config.ts`) and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. If any Firebase value is missing, the app runs local-only and hides the Account row. Never commit `.env`.
4. Run `npx expo start` and open the web build, or run `npx expo run:android` for a device build.

Test on a development build, not Expo Go. Background audio and notifications behave differently in Expo Go.

## The shape of the code

```
app/                    Expo Router routes. Thin: render WickglowScreen.
components/wickglow/
  wickglow-screen.tsx   Public entry, picks the layout
  logic.tsx             The provider: state, actions, two contexts
  screens/              mobile.tsx, tablet.tsx, desktop.tsx. Arrangement only
  features/             One folder per product concept (timer, tasks, audio, ...)
  hooks/                Audio, clock and zen hooks
  domain/               Persistence, scheduling, file I/O, sync, platform wrappers
  shared/               Icons, panel styles, cross-layout UI
src/core/               Pure logic: XP, streaks, quests, timer math, sync rules
src/data/               The only code that talks to Firebase
src/theme/              Color, font and radius tokens
firestore.rules         Server-side checks on every write
firestore-tests/        Rules tests against the emulator
plugins/                Expo config plugins for native settings
public/                 Static web files: privacy, delete-account, scenes
```

The layers depend in one direction:

```
screens  →  features  →  logic.tsx  →  domain  →  src/core
                                          ↓
                                       src/data  →  Firebase
```

Two rules keep this clean, and both are checked in review:

- `src/core` imports nothing from React, React Native, Expo or Firebase. Everything there is a pure function that takes `now` (and a random source where chance is involved). That makes the reward logic testable without a device.
- Only `src/data` imports Firebase.

## Following one focus session

Following one session from start to finish touches most of the system.

1. **Start.** A screen calls the `toggle` action from `useWickglow()` (start, pause and resume share one button). `logic.tsx` hands it to `domain/session-run.ts`, which owns every timer change. It stores `endAt` (now + the focus length) and commits the state to storage at once.
2. **Alarm.** `session-run.ts` schedules one local notification at `endAt` on the `session-end` channel. It is the only caller of `scheduleSessionEnd` and `cancelSessionEnd`. Every pause, resume, reset, skip and mode change cancels and reschedules it, so there is never more than one.
3. **Ticking.** `hooks/use-session-clock.ts` computes `remaining = endAt - now` every 250 ms and publishes a new value only when the displayed second changes. There's no counter to drift when Android throttles background JS. Only `TimeText` and `SessionCandle` read this clock context.
4. **End.** When `remaining` reaches zero, `session-run.ts` finishes the session. `completeSession` in `src/core/session.ts` is the one reward path. It pays 2 XP per minute, adds the minutes, appends a record to the session log and, for sessions of 10 minutes or more, counts the session and updates the streak. `src/core/quests.ts` then claims any daily quest that was reached.
5. **Gentle end.** The flame dims, the chime plays, the music keeps playing, lowers or fades according to the user's setting, and `src/core/session-end.ts` picks a message. The next phase comes from `modeAfterComplete` in `src/core/phase.ts`: a long break after every fourth focus session.
6. **Save and sync.** The new state is written to AsyncStorage. If the user is signed in, `domain/account-sync.ts` uploads the new session record 1.5 s later.

If the app was killed during the session, the saved `endAt` is still there on the next launch, so the app shows the finished state and the notification has already fired.

## State and storage

- **One saved value.** All state is one JSON value in AsyncStorage under `wickglow:state`. On web, browser tabs share it and stay in step through the `storage` event.
- **One writer.** `domain/saved-store.ts` holds the newest state and is the only thing that changes it. The provider reads it with `useSyncExternalStore`.
- **Two write speeds.** `store.commit` writes at once and is used for timer changes. `store.update` is batched by `domain/save-queue.ts` and written 300 ms after the last change, so dragging a slider doesn't write on every step. A waiting save is flushed when the app leaves the foreground.
- **Validated on read.** `parseSavedState` checks every field and keeps only known ones, so a corrupt or hand-edited save can't crash the app or pay out more than the UI allows.
- **Two contexts.** `useWickglow()` returns the state and actions and changes only when something on screen changes. `useWickglowClock()` changes every second while a session runs. Don't read the clock context in a shell or panel, or the whole component re-renders every second.
- **Stable actions.** Actions keep the same identity for the life of the provider. A new action goes in both `WickglowActions` and `ACTION_NAMES`, and the compiler fails if you forget the second.

Details: [architecture.md, Storage model](agent/architecture.md#storage-model).

## Accounts and sync

Accounts are optional and use Firebase Auth (email/password and Google) and Firestore on the free Spark plan. There are no Cloud Functions, which drives most of the design.

- **The device is the source.** The app always reads local state. Firestore is a copy it syncs with.
- **Records, not totals.** Firestore never stores XP, level or streak. It stores records under `users/{uid}/records`: one per finished session (`s_...`), one per day total from before sync existed (`d_...`), one per task (`t_...`), and a `reset` marker. Every device rebuilds XP, level and streak from those records with `rebuildProgress` in `src/core/progress-log.ts`, so two devices always agree.
- **Rules bound each write.** With no server code, `firestore.rules` is the only server check. It caps what one write can add (a session is at most 180 minutes, for example) and rejects stale task edits. It can't stop a modified client from writing many sessions, so account XP isn't comparable between users. That's acceptable while nothing compares XP.
- **Read only what's new.** Each record carries the server write time `at`. A device remembers the newest time it has seen and queries from there, so opening the app usually costs about one read. A full read happens only on first sign-in, on a new device, after 30 days away, or after a reset.
- **Conflicts.** Session records are kept once by id. For tasks, the latest edit wins and a delete wins.
- **Sign-out clears progress** from the device and keeps settings, so the next account to sign in there can't take it.

The sync rules are in `src/core/sync.ts`, the wiring is in `domain/account-sync.ts`, and the Firestore calls are in `src/data/progress-remote.ts`. Read [feature/firebase.md](feature/firebase.md) before changing any of it, and run `npm run test:rules` after any rules change. Changing the schema or rules needs the owner's approval first.

## Audio

- Playback uses `expo-audio`. `expo-av` has been removed and must not come back.
- Music and ambient loops play through the media playback foreground service, so they keep going with the screen off. That is the only foreground service. Don't add one for the countdown.
- Ambient players are created the first time a slider goes above zero. The list of sounds is `AMBIENT_SOUNDS` in `src/core/ambient.ts`, and each one needs a file in `components/ambient-tracks.ts`.
- `src/core/music-source.ts` decides who owns the sound: the local player, a streaming embed or another app. `logic.tsx` sends it events and carries out the pause or play it returns.
- Streaming links play in the service's own embed and never enter `expo-audio`. They're limited to the desktop layout on web.
- User files are copied into `Paths.document/own-tracks`. Only their id, title and URI are saved.
- Every bundled audio file must be listed and cleared in [MUSIC_LICENSES.md](../MUSIC_LICENSES.md). Never ship unlicensed audio.

## Layouts

`features/layout.ts` holds the only breakpoint logic. On web, it uses the window width: under 600 is phone, 600 to 840 is tablet, over 840 is desktop. On Android and iOS, a window whose shorter side is 840 or less never gets the desktop layout, so rotating a phone or tablet gives the split tablet view.

The three shells in `screens/` only arrange feature panels. They contain no business rules. A device difference inside a feature is a `mobile` prop, not a separate component folder.

Styling uses `StyleSheet` with tokens from `src/theme/tokens.ts`. Don't hardcode colors. The app is dark only for v1. Icons come from `shared/icons.tsx`, never from the Lucide packages directly. Full UI rules: [ui.md](agent/ui.md).

## Making a change

1. Read [progress.md](agent/progress.md). Build only the item marked Current. If a requirement is missing, add it under Open Questions and ask instead of guessing.
2. Put each piece in its layer:
   - New reward, streak or quest rule: a pure function in `src/core` with tests.
   - New timer action: `domain/session-run.ts`, not `logic.tsx`.
   - New Firebase call: `src/data`, catching `FirebaseError` and returning a plain result.
   - New UI: the matching `features/` folder, arranged by the shells.
3. Add Expo packages with `npx expo install`, then run `npx expo-doctor@latest`. Ask before adding any dependency.
4. Change native settings in `app.json` or a config plugin in `plugins/`. Never edit `android/` or `ios/`.
5. Update the matching doc in the same change, and add a line to `progress.md`.

Ask the owner first before adding dependencies, changing the Firestore schema or rules, changing auth, adding Android permissions, or deleting files.

## Testing

| What | Command |
| --- | --- |
| All unit tests (native and web configs) | `npm test` |
| One file | `npx jest path/to/file.test.ts` |
| Typecheck | `npx tsc --noEmit` |
| Lint | `npx eslint path/to/file.tsx` |
| Firestore rules (needs Java) | `npm run test:rules` |
| Web build | `npx expo export --platform web` |

The build, typecheck and tests must all pass before a change is finished.

Tests sit next to the file they cover (`*.test.ts`). `src/core` has the most coverage. Those tests pass `now` explicitly, so they cover midnight and skipped days without mocking the clock. `domain/session-run.ts` takes the alarm, music, time and screen effects as arguments, so its tests run without a device. `domain/account-sync.test.ts` runs two fake devices against one in-memory account.

Some things only show up on a real Android device: notification timing, screen-off audio, and R8 problems in release builds. Check those on a device.

## Building and releasing

| Build | Command | Use |
| --- | --- | --- |
| Development | `eas build --platform android --profile development` | Dev client for daily work |
| Preview | `eas build --platform android --profile preview` | Sideloadable APK for testing |
| Production | `eas build --platform android` | `.aab` for Google Play |
| Submit | `eas submit` | Upload to Play |

EAS uses Node 24.12.0. The preview and production builds share the EAS keystore that Play will use, so don't delete it. Test the production build on a device before submitting.

The web app is deployed to Vercel at <https://wickglow.vercel.app>. The export copies `public/` into `dist/`, which serves the privacy policy, the account deletion page and the background scenes that Android downloads. A new scene reaches Android only after the web deploy that contains it is live.

Firestore rules are deployed separately with `npm run deploy:rules`, which needs the owner's `firebase login`.

The current Google Play checklist is in [progress.md](agent/progress.md#google-play-deployment).

## Pitfalls

- **Expo Go** hides background audio and notification bugs. Use a development build.
- **`@react-navigation/*` imports** fail at bundle time. Import from `expo-router`.
- **`react-native-web` gaps.** Some `react-native` exports are `undefined` on web even though they typecheck. Check the browser, not just `tsc`. `useAnimatedValue` is the known case and has a local hook.
- **`+html.tsx`** must render `headNodes` and `bodyNodes`, or the exported web page has no scripts and stays on the loading screen.
- **SFX file names are case-sensitive.** Keep `chime.mp3` (lower case, which Android notification sounds require) and `SessionEndChime.MP3` exactly as named. Metro resolves paths case-sensitively, so a file that only differs in case breaks `npx expo export`, even though Windows shows it as the same file.
- **Scene files** in `public/scenes/` carry a version folder and a byte size in the catalog. A re-encoded file needs a new version and its new size, or the download size check rejects it.
- **Uncleared videos.** Some background videos aren't cleared for distribution yet (issue C1 in [issues.md](issues.md)). Check [BACKGROUND_LICENSES.md](../BACKGROUND_LICENSES.md) before wiring in a scene.
- **`npm audit fix --force`** downgrades Firebase. The `overrides` in `package.json` already handle the reported issues.
- **`.agents/skills/`** files are hash-pinned in `skills-lock.json`. Local edits get reverted.
