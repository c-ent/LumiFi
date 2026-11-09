# LumiFi

Calm lofi Pomodoro study app with XP and streaks. Android and web from one Expo codebase.

Status: Expo SDK 58 app. Commands below match this repo.

## Commands

- Install: `npm install` (Expo packages: `npx expo install <pkg>`)
- Dev server: `npx expo start` (device build: `npx expo run:android`)
- Build (must pass before finishing any task): `npx expo export --platform web`
- Typecheck: `npx tsc --noEmit`
- Test one file: `npx jest path/to/file.test.ts`
- Lint one file: `npx eslint path/to/file.tsx`
- After adding or upgrading a package: `npx expo-doctor@latest`

## Stack
- Needs Node 22.13+ (22 line), 24.3+ or 26. Odd-numbered Node versions are unsupported.
- Test on an EAS development build, not Expo Go. Background audio and notifications behave differently there.

## Conventions the code does not show
- Timer: store `endAt` and compute `remaining = endAt - now`. Do not decrement a counter, because background JS timers are throttled.
- Session end: keep exactly one scheduled local notification at `endAt`, and cancel and reschedule it on every pause, resume, reset, skip and mode change. Do not add a foreground service for the countdown. The only one is the media playback service that `expo-audio` uses.
- Audio: use `expo-audio`, not `expo-av` (removed). Do not request microphone permission, LumiFi never records. A pasted streaming link plays in that service's own player and never enters `expo-audio`.
- Navigation: import from `expo-router`, not `@react-navigation/*`, which fails at bundle time since SDK 56.
- Packages: run `npx expo install`, not `npm install`, for Expo packages so versions match the SDK.
- Native folders: edit `app.json` or `app.config.ts`, not `android/` or `ios/`, which prebuild generates.
- XP, levels, streaks, quests, pet drops: write them as pure functions in `src/core` that take `now` (and a random source where chance is involved), not as logic in components. The server validates rewards, so never send an XP total from the client.
- Env: only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` go in the client, never the service role key.

## Decisions

| Situation        | Use                                                                                                                 | Because                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Layout switching | Web width: under 600, 600 to 840, over 840. On Android and iOS, a shorter side of 840 or less stays phone or tablet | Turning a phone or tablet should keep the split layout, not open the desktop scene         |
| Theme            | Dark only for v1                                                                                                    | Both prototypes are dark, tokens allow light later. A light theme is a later token set     |
| Icons            | Lucide, stroke width 1.8, size 20. `lucide-react-native` on Android and iOS, `lucide-react` on web                  | Chosen 2026-11-03. Not installed yet; the hand-drawn icons stay until that swap is current |
| Styling          | `StyleSheet` plus tokens in `src/theme`                                                                             | React Native has no CSS variables                                                          |
| Session end      | Flame dims softly, soft chime, short message. No harsh alarm                                                        | Competitor research: users like a gentle end                                               |
| Name in code     | Display name is "LumiFi". Package ids, slugs and URL schemes use `lumifi`                                           | Package id rules                                                                           |

## Boundaries

- **Always:** Run the build, typecheck and tests before finishing; update `docs/agent/progress.md` after each meaningful change. Use native codebase indexing/search tools to query patterns across the codebase rather than spawning individual terminal find/grep commands.
- **Ask first:** Adding dependencies, changing the database schema or RLS policies, deleting files, changing auth, adding Android permissions, adding ads, tracking or paid features.
- **Never:** Commit secrets or `.env` files, edit generated files (`android/`, `ios/`, `.expo/`, `dist/`, `src/data/database.types.ts`), force push, skip failing tests, ship unlicensed audio, copy another product's name, art or music, add notes, planner, flashcard or room features unless that item is the current roadmap item. 
- **Never (Tool Constraints):** Do not run iterative terminal search/regex commands (`grep`, `find`, `Select-String`, `Get-ChildItem`) to look up components or files. Do not write or execute custom standalone runtime test scripts (e.g. custom node scripts to probe assets or bundling) or parse local `.shots` images unless explicitly asked. Let the codebase-wide search tool find files in a single pass.

## Workflow

- One feature at a time, in small steps you can verify end to end. Big features ship one by one from `docs/agent/roadmap.md`.
- Build only the item marked Current in `docs/agent/progress.md`. Roadmap items are specs, not permission to build them.
- Do not invent product behavior. If a requirement is missing, add it under Open Questions in `docs/agent/progress.md` and ask before building.
- If a change alters architecture, scope or conventions, update the matching doc in the same change.
- At the start of a session, read `docs/agent/progress.md`.

## Read when relevant

- Building or changing a v1 feature: `docs/agent/spec.md`
- Starting or planning a v2 or v3 feature, or asked what comes next: `docs/agent/roadmap.md`
- Changing data flow, storage, auth, or folder boundaries: `docs/agent/architecture.md`
- Unsure about a convention: `docs/agent/conventions.md`
- Touching UI, styling, or layout: `docs/agent/ui.md`

## Git & destructive actions

- NEVER run `git commit`, `git push`, `git reset --hard`, `git clean`, or force-push unless the owner explicitly asks in this conversation.
- NEVER delete files/folders (`rm`, `rm -rf`) or drop/truncate/delete database data without asking the owner first and showing the owner exactly what will be affected.
- Leave changes uncommitted in the working tree so the owner can review the diff.
- If a task seems to need one of these, stop and ask the owner.
