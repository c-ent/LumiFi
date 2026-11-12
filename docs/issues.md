# Issues

Findings from the code audit of 2026-11-11. Work through them in the order the owner sets, and update the Status line of each one as it changes.

Status values: Open, Fixed (with the date), Needs decision.

Order set by the owner on 2026-11-11: High first (H1 to H6), then Medium (M1 to M8), Critical last. Only C1 is still open.

## Critical

### C1. Uncleared videos are selectable in the shipping picker

- Status: Open
- Where: `components/wickglow/features/background/video-art.ts` lines 8 to 15, `BACKGROUND_LICENSES.md`
- Cause (updated 2026-11-12): five Wallper videos are wired into `VIDEOS`, and any build or web export made now ships them. The earlier moewalls.com attribution was wrong; the originals were traced to Wallper. Wallper's terms license uploads to Wallper only, so each rests on Wallper's permission:
  - `cyberpunk_desk`: the owner reports Wallper said it may be used (2026-11-11). Wallper's reply is not on file yet.
  - `frog_lily_pond`: the same Wallper permission; the artist (Abi Toads) has no written permission on file.
  - `snowy_sled`, `mossy_branch`, `night_hills`: not covered by that permission yet, and their Wallper pages and uploaders are not recorded. `night_hills` also has an unidentified watermark.
- Fix: record each permission and page in `BACKGROUND_LICENSES.md`, or remove the unconfirmed entries from `VIDEOS` and `VIDEO_IDS` before shipping. A saved id that no longer exists already falls back to the gradient.
- Also: `270983_medium.mp4` (Classic, Pixabay) now has a row, but its Pixabay page URL and artist are not yet checked.

## High

### H1. Start computes the deadline before awaiting the permission work

- Status: Fixed 2026-11-11
- Where: `components/wickglow/logic.tsx`, `begin`
- Cause: `startSession` ran first, then `await prepareNotificationPermission`, then `commit`. On first run the user answered the system prompt while the clock was already running unseen, so a 25:00 session could appear at 24:40. A Reset, Skip or mode change during that wait was overwritten when the stale session was committed.
- Fix made: the started session is committed straight away. The permission work runs after it, and the alarm is scheduled only if the session that is running then is still the one that was started (`isSameRun` in `src/core/clock.ts`).

### H2. Auto-start leaves the music lowered or stopped

- Status: Fixed 2026-11-11
- Where: `components/wickglow/logic.tsx`, `finish`
- Cause: `finish` applied the session-end music setting, but only `begin` restored the volume and played. With auto-start the next phase began without `begin`, so "Lower" stayed at half volume through the next session and "Fade" stopped the music for good.
- Fix made: when the next phase auto-starts, the music is restored and played the same way a manual start does it, and the session-end lowering or fade is skipped. The chime still plays. When the next phase does not auto-start, nothing changed.

### H3. Every context consumer re-renders four times a second while the timer runs

- Status: Fixed 2026-11-11 (small fix)
- Where: `components/wickglow/hooks/use-session-clock.ts`
- Cause: the 250 ms tick set state in the provider on every tick, which rebuilt the single context value, so every screen and panel re-rendered even though the display changes once a second.
- Fix made: the tick still runs every 250 ms, but it only updates state when the second on screen changes (`displaySecond` in `src/core/clock.ts`). The candle and ring now move once a second.
- Left for later: a separate context for `remaining` and `progress`, so a tick does not touch the task list or the mixer at all.

### H4. Every slider tick serialises and writes the whole save

- Status: Fixed 2026-11-11
- Where: `components/wickglow/logic.tsx`, `components/wickglow/domain/save-queue.ts`
- Cause: the persist effect ran `JSON.stringify` on the full state plus an AsyncStorage write on every change, including each step of a slider drag. `commit` also wrote, and then the effect wrote the same state again.
- Fix made: a save queue. Timer changes (`commit`) still write at once. Everything else waits 300 ms after the last change and is written once. A waiting save is written straight away when the app leaves the foreground or the provider unmounts, and a state already written is not written twice.

### H5. Eleven audio players are created at launch

- Status: Fixed 2026-11-11, not yet checked on a device
- Where: `components/wickglow/hooks/use-ambient.ts`, `components/wickglow/hooks/use-background-audio.ts`
- Cause: nine ambient players were built and given a source at launch even with every slider at zero.
- Fix made: an ambient player is created the first time its slider goes above zero. Once created it is kept and paused at zero, and all of them are released when the provider unmounts.
- Still to check on a device: each loop starts when its slider is raised, keeps playing with the screen off, and the lock-screen card still shows "Ambient" when only ambient is playing.

### H6. One test fails in the working tree

- Status: Fixed 2026-11-11, owner to confirm the value
- Where: `src/theme/tokens.test.ts`, `docs/agent/ui.md`
- Cause: the test and `ui.md` said `bgControl` is white at 11%, while `tokens.ts` has 20% with a comment saying it was made more solid for video backgrounds.
- Fix made: the test and `ui.md` now say 20%, so the app looks the same as before. If 11% was the intended value, change `tokens.ts`, the test and `ui.md` back together.

## Medium

### M1. Two competing ways to write state

- Status: Fixed 2026-11-11
- Where: `components/wickglow/logic.tsx`, the 15-second tick and the task actions
- Cause: `commit` builds from `savedRef`, which is synced in an effect and can lag a render, while other actions use functional updaters. The 15-second tick reads `savedRef.current` inside an updater, so it can return a stale state and drop a pending change. `showToast` is called inside updaters, which React may run twice.
- Fix made: `savedRef` is now the newest state, and only `commit`, `update` and the day roll write it, each setting the ref and the React state together. The effect that copied the rendered state back into the ref is gone, so the ref cannot fall behind. Task changes that can pay a reward go through `step`, which runs the rule once and shows the toast outside any React updater.

### M2. Progress uses the setting, not the session's own length

- Status: Fixed 2026-11-11
- Where: `components/wickglow/logic.tsx`, `total`
- Cause: `total` comes from `saved.cfg`, so changing the focus length during a running session makes the candle and ring jump.
- Fix made: `total` is `saved.session.totalMs`, the length the session was started at.

### M3. Some saved fields are not validated, and there is no error boundary

- Status: Fixed 2026-11-11
- Where: `components/wickglow/domain/saved-state.ts` lines 105 to 113, `app/_layout.tsx`
- Cause: `mix`, `streak`, `scene`, `mood` and `zenOpt` are spread in as stored, and unknown keys are carried forever. A non-numeric `mix` value reaches `player.volume` as `NaN` on every launch.
- Fix made: `mix` is clamped to 0..100 per slider, `scene`, `mood`, `zenOpt`, `streak` and `cycle` are validated, and the state is built from the known fields only, so unknown keys are dropped. `app/index.tsx` exports an `ErrorBoundary` with a "Try again" button. It sits on the route, not the layout, because that is the file that renders the screen.

### M4. Picked music files are stored twice

- Status: Fixed 2026-11-11, not yet checked on a device
- Where: `components/wickglow/domain/own-music.ts`
- Cause: the picker copies to cache, then the file is copied to documents and the cache copy is never deleted.
- Fix made: the picker's cache copy is deleted after a successful copy. Only a file inside the app's cache folder is ever deleted, so the user's original cannot be touched.

### M5. Notification channels are rebuilt on every Start

- Status: Fixed 2026-11-11
- Where: `components/wickglow/domain/notifications.ts` lines 74 to 93
- Cause: two deletes and one create run as native calls each time a session starts.
- Fix made: the channel set-up runs once per run of the app. A failed set-up is tried again on the next Start.

### M6. Exact-alarm permissions need a look before the manifest check

- Status: Fixed 2026-11-11 in the manifest; the Play declaration is still the owner's
- Where: `app.json` lines 14 to 17
- Cause: both `USE_EXACT_ALARM` and `SCHEDULE_EXACT_ALARM` are declared, with no `maxSdkVersion` on the second. The second is probably only needed up to Android 12, and Play asks for a declaration for the first. Check both against current Play policy.
- Fix made: `plugins/with-exact-alarm-max-sdk.js` sets `android:maxSdkVersion="32"` on `SCHEDULE_EXACT_ALARM`, so it only applies on Android 12 and 12L, where `USE_EXACT_ALARM` does not exist. Checked with `npx expo config --type introspect`.
- Still the owner's: Play Console asks for a declaration for `USE_EXACT_ALARM`. Wickglow qualifies as a timer app, but the form has to be filled in.
- Seen while checking: the evaluated manifest also lists `READ_EXTERNAL_STORAGE`, which a library adds. Worth a look in release step 5.

### M7. A failed embed opens another app without being asked

- Status: Fixed 2026-11-11, owner to confirm the behaviour
- Where: `components/wickglow/features/audio/stream-player.tsx`
- Cause: any load error, including being offline, sets `failed`, and on Android that calls `Linking.openURL` automatically with a "may be private" message.
- Fix made: a failed embed no longer opens another app on its own. Every platform shows "This link could not be played here. It may be private, or you may be offline." with an "Open link" button. To get the automatic Android handoff back, restore the effect in `stream-player.tsx`.

### M8. Small cleanups

- Status: Fixed 2026-11-11
- `storage.ts`: the header comment now describes the real save path and the real legacy key (`lumifi:state`).
- `docs/agent/architecture.md`: says there is no Zustand, no `src/data` and no Supabase client, and describes how state is written and read.
- `src/core/stream-links.ts`: `MAX_STREAM_LINKS` stays at 30. It is a safety bound on reading a stored list, not the product limit, and a test relies on more than one stored link loading. A comment now says so.
- `src/core/deadline.ts`: the four unused helpers and their tests are removed. `timerProgress` stays.
- `use-music.ts`: a failed chime seek is caught, and the chime still plays.
- `.gitignore`: ignores `.env` and `.env.*`, and keeps `.env.example`.

## Architecture

From the architecture review of 2026-11-11 (the `improve-codebase-architecture` skill). These are not bugs. Each one moves rules that are spread over several places into one module that can be tested on its own. None of them should change what the app does. Order of work: A2, A3, A1, A4, A5, A6. All six are done.

### A1. The session transitions are wired by hand in the provider

- Status: Fixed 2026-11-11, not yet checked on a device or in a browser
- Where: `components/wickglow/logic.tsx` (`begin`, `pause`, `reset`, `skip`, `setMode`, `finish`, `updateCfg`, the launch effect)
- Cause: each transition saves the clock, moves or cancels the session-end alarm, clears or shows the end card, and starts or lowers the music, all in its own closure inside a React component. The "exactly one notification at `endAt`" rule lives in how those closures are written, and no test can reach them. H1 and H2 were bugs in this code.
- Fix: one plain module owns every transition. The alarm, the music and the time are handed in, so tests can run it with stand-ins.
- Fix made: `components/wickglow/domain/session-run.ts` has start, pause, toggle, reset, skip, mode change, length change, the session end and the alarm restore on launch. It is the only caller of the alarm functions. `logic.tsx` builds it once (`useSessionRun`) and the timer actions call it. `session-run.test.ts` has 23 tests, including the H1 cases (a reset, pause, skip or mode change while the permission prompt is open leaves no alarm) and the H2 case (auto-start keeps the music).

### A2. Which player owns the sound is tracked by four refs

- Status: Fixed 2026-11-11, not yet checked on a device or in a browser
- Where: `components/wickglow/logic.tsx` (`activeStreamIdRef`, `heldForEmbed`, `resumeWhenActive`, `leftForStream`, set by `openStream`, `closeStream`, `releaseStreamForLocal`, `startSessionMusic` and an `AppState` listener)
- Cause: the hand-off between the local player, an embed and another app is a state machine spread over four booleans and six writers, with no tests.
- Fix: one pure module in `src/core` with named states. It takes an event and returns the next state and whether to pause or play the local player.
- Fix made: `src/core/music-source.ts` has three states (local, embed, handed off to another app) and `stepMusicSource`. The four refs in `logic.tsx` are now one, written only by `sendSource`. `music-source.test.ts` has 11 tests.

### A3. Saving is spread over the provider

- Status: Fixed 2026-11-11, not yet checked on a device or in a browser
- Where: `components/wickglow/logic.tsx` (`savedRef`, `commit`, `update`, the persist effect, the flush effect, the day roll), `components/wickglow/domain/save-queue.ts`
- Cause: three writers each have to set the ref and the React state together, and the timing between them, the save queue and the effects has no test.
- Fix: one store module outside React holds the newest state, takes every change and decides when to write. The provider subscribes to it.
- Fix made: `components/wickglow/domain/saved-store.ts` has `get`, `subscribe`, `commit`, `update` and `flush`, built on the save queue. The provider reads it with `useSyncExternalStore`. `savedRef`, `setSaved` and the persist effect are gone, and the day roll is an ordinary `update`. `saved-store.test.ts` has 9 tests.

### A4. The three screen shells repeat the same session rules

- Status: Fixed 2026-11-11, not yet checked on a device or in a browser
- Where: `components/wickglow/screens/mobile.tsx`, `tablet.tsx`, `desktop.tsx`
- Cause: the zen timer, the start label, the "n of 4" line, the lit pips and the end card are written out in each shell. `cycle % 4` is a phase rule in layout files, against invariant 2 in `architecture.md`.
- Fix: derive what the timer shows in one pure module, plus one zen hook. Each shell only arranges it.
- Decided: desktop says "Start" and hides after 3.5 seconds, while phone and tablet say "Light the candle" and hide after 4 seconds. The owner confirmed on 2026-11-11 that the difference is intended.
- Fix made: `src/core/session-face.ts` (`sessionFace`) gives the start label, the "n of 4" line, the lit pips and the focus chip, in a `candle` style (phone, tablet) and a `plain` style (desktop). `hooks/use-zen.ts` is the zen timer. `CYCLE_LENGTH` in `src/core/phase.ts` replaces the bare 4s, and `MODE_LABEL` moved to `session-face.ts` (`theme.ts` re-exports it). The three shells now only arrange these. The two styles keep each layout's wording exactly as it was, including the desktop break line. `session-face.test.ts` has 4 tests.

### A5. The ambient sounds have no single list

- Status: Fixed 2026-11-11, not yet checked on a device or in a browser
- Where: `components/ambient-tracks.ts`, `components/wickglow/theme.ts`, `hooks/use-ambient.ts`, `hooks/use-background-audio.ts`, `logic.tsx`, `domain/saved-state.ts`, `features/audio/mixer-block.tsx`
- Cause: the nine sound names are spelled out in seven files, some of them in effect dependency lists the compiler does not check. There are two level types, one 0..100 and one 0..1.
- Fix: one list of sounds that the types, the players, the saved defaults and the mixer rows read.
- Fix made: `src/core/ambient.ts` lists each sound's key and label once and defines `AmbientKey`, `MixLevels`, `silentAmbient`, `ambientOn` and `firstAudible`. `components/ambient-tracks.ts` is now one `AMBIENT_SOURCES` map keyed by `AmbientKey`, so a sound with no file does not compile. Levels stay 0..100 everywhere; `use-ambient.ts` is the one place they become a 0..1 volume. The lock-screen effect now re-runs only when the audible sound changes, not on every slider step. `ambient.test.ts` has 3 tests. Adding a sound is now a row in `ambient.ts` and a file in `ambient-tracks.ts`.

### A6. Two modules only pass names through, and the timer limits are typed twice

- Status: Fixed 2026-11-11
- Where: `components/wickglow/domain/session.ts`, `components/wickglow/theme.ts`, `domain/saved-state.ts` (`MAX_MINUTES`), `features/settings/timer-settings.tsx` (`max={180}`, `{60}`, `{90}`)
- Cause: `domain/session.ts` is re-exports only, and `logic.tsx` imports from `src/core` directly as well. The minute ceilings are in the save parser and again in the settings panel, kept in step by a comment.
- Fix: put the limits in `src/core/phase.ts` for both to read. Import from `src/core` directly and delete `domain/session.ts` (needs the owner's go-ahead, since it deletes a file).
- Fix made: `MAX_MINUTES`, `MIN_MINUTES` and `DEFAULT_MINUTES` are in `src/core/phase.ts`. The save parser, the fresh state and the settings fields read them.
- Fix made: `domain/session.ts` is deleted (owner's go-ahead, 2026-11-11). `logic.tsx`, its only user, imports from `src/core` directly.
- Kept on purpose: `theme.ts`. It is not only a pass-through: it holds the scene and mood palettes, `PRESETS` and `formatTime`. Its re-exports of `src/core` names stay, since removing them would touch 12 files for no change in behaviour while the release is being prepared.

## Best practices

From a check against the `vercel-react-native-skills` rules in `.agents/skills`, 2026-11-11. The app already followed most of them (transform and opacity animations, `.get()` and `.set()` on shared values, a native stack, `Pressable`, no falsy `&&` in JSX, hoisted `Intl` formatters, `StyleSheet.create` with tokens). These are the gaps.

### B1. Components dot into one context object that is rebuilt every render

- Status: Fixed 2026-11-11, not yet checked on a device or in a browser
- Rule: `react-compiler-destructure-functions` (the skill rates it High), `react-state-minimize`
- Where: `const lamp = useWickglow()` then `lamp.x` in the three screen shells, `timer-settings.tsx`, `task-list.tsx` and four places in `music-block.tsx`. The root cause is in `logic.tsx`.
- Cause: the provider builds a new context value and new action functions on every render, and it renders once a second for the clock and about twice a second while music plays. The React Compiler keys its cache on `lamp`, so those components get little memoisation.
- Fix made, in four parts:
  - Every action keeps one identity for the life of the provider (`useStableActions` in `logic.tsx`).
  - The context value is memoised, so it changes only when something on screen changes.
  - The clock has its own provider and context (`useWickglowClock`). A tick re-renders only `TimeText` and `SessionCandle`, not the screens.
  - The nine components that used `lamp.x` for actions now destructure them.
- This also finishes the part of H3 that was left for later.

### B2. Lists are not virtualised

- Status: Fixed 2026-11-11 for the track list, not yet checked on a device or in a browser; the task list is left as it is
- Rule: `list-performance-virtualize`
- Where: the task list (`task-list.tsx`) and the track list (`music-block.tsx`, `TrackRows`) map every row inside a `ScrollView`.
- Cause: fine for 14 bundled tracks, but own files can reach 500 and each row draws an SVG tile.
- Decision: the owner approved the new dependency on 2026-11-11. `@shopify/flash-list` 2.3.2 was added with `npx expo install`.
- Fix made: the track list is a FlashList on all three layouts.
  - Phone and tablet: `SoundsScroller` in `music-block.tsx` is the page's own scroller. The track rows are the list's items, and the rest of the page (mood picker, tabs, player, mixer, and on tablet the tasks, quests and calendar) rides along as the list's header and footer. The page should look and scroll as before.
  - Desktop: `WideTrackGrid` is a two-column FlashList inside the playlist box.
- Not changed: the task list. Its rows keep their own editing state (the title being edited, a half-typed date, the subtask draft), which a recycling list would carry from one row to another, and on tablet it shares the column with the track list, and only one list can be the scroller. Task lists are short, so the cost is small.

### B3. Fonts load at runtime

- Status: Fixed 2026-11-11, takes effect in the next native build
- Rule: `fonts-config-plugin`
- Where: `useFonts` in `wickglow-screen.tsx`; the `expo-font` plugin in `app.json` lists no fonts.
- Cause: the screen can draw once in the system font before the real fonts arrive.
- Fix made: the seven font files are listed in the `expo-font` plugin in `app.json`, so Android embeds them at build time under the same names the tokens use. `useFonts` stays for web and for a development build made before this change. An existing development build keeps working as before; rebuild it to get the embedded fonts.

### B4. Styling details

- Status: Fixed 2026-11-11 (corners and shadow); gradients left as they are
- Rule: `ui-styling`
- Where: a few card and button corners use a raw `borderRadius` without `borderCurve`; `mood-picker.tsx` uses the legacy `shadowColor`; gradients are drawn with `react-native-svg`.
- Fix made: the five real card and button corners that used a raw `borderRadius` now use `rounded()` (two in `music-block.tsx`, two in `month-calendar.tsx`, one in `stat-grid.tsx`). Circles, dots and bars are left alone, since a continuous curve changes a circle. `borderCurve` only shows on iOS, so nothing changes on Android or web.
- The `shadowColor` in `mood-picker.tsx` is removed. It did nothing: the glow comes from the `boxShadow` already in `moodFlame`, so the look is the same.
- Not changed: the gradients stay on `react-native-svg`. `experimental_backgroundImage` has to be looked at on web and Android before it replaces them.

### B5. `react-native` `Image` instead of `expo-image`

- Status: Fixed 2026-11-11, needs a new development build
- Rule: `ui-expo-image`
- Where: the 12 thumbnails in `scene-picker.tsx`.
- Decision: the owner approved the new dependency on 2026-11-11. `expo-image` was added with `npx expo install`, which also added its config plugin to `app.json`.
- Fix made: the scene picker's thumbnails use `Image` from `expo-image` with `contentFit="cover"`.
- `expo-image` is a native module. A development build made before this change does not contain it, so the Scenes panel will fail there until the build is remade (`npx expo run:android`). Web is not affected.

### B6. The stream embed slot is measured a frame late

- Status: Fixed 2026-11-11, not yet checked in a browser
- Rule: `ui-measure-views`
- Where: `desktop.tsx`, `placeEmbed`
- Cause: the slot is measured with `measureInWindow` inside a `requestAnimationFrame`, so the embed is hidden for a frame when the Music card opens.
- Fix made: a layout effect reads the slot with `getBoundingClientRect` in the same pass the Music card is laid out. If that read is missing or has no size yet, it falls back to the old measure one frame later. `onLayout` still handles later changes.
