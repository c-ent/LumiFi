# LumiFi

Calm lofi Pomodoro study app with XP and streaks. Android and web from one Expo codebase.

## Requirements

- Node 22.13+, 24.3+ or 26. Odd-numbered Node versions are unsupported.
- An [EAS development build](https://docs.expo.dev/develop/development-builds/introduction/) or `npx expo run:android`. Background audio and notifications behave differently in Expo Go, so do not use it for testing.

## Setup

```bash
npm install
npx expo start
```

Add Expo packages with `npx expo install <pkg>`, not `npm install`, so versions match the SDK.

The Android and iOS folders are generated. Run `npx expo prebuild` instead of editing them by hand, and change `app.json` or `app.config.ts` for native config.

## Commands

| Task | Command |
| :--- | :--- |
| Dev server | `npx expo start` |
| Android device build | `npx expo run:android` |
| Web build | `npx expo export --platform web` |
| Typecheck | `npx tsc --noEmit` |
| Tests | `npx jest` |
| One test file | `npx jest path/to/file.test.ts` |
| Lint | `npx eslint .` |
| Dependency check | `npx expo-doctor@latest` |

Run the build, typecheck and tests before finishing a change.

## Project layout

- `app/`: Expo Router routes. Thin files that render a screen.
- `components/lumifi/`: the UI, grouped by feature.
- `src/core/`: pure logic — timer math, XP, levels, streaks, quests. No React or Expo imports.
- `src/theme/`: color, font and radius tokens.
- `assets/audio/`: licensed audio only, listed in `MUSIC_LICENSES.md`.

## Documentation

Start with [`AGENTS.md`](AGENTS.md) for commands, conventions and boundaries. The design and planning docs live in [`docs/agent/`](docs/agent/):

- [`progress.md`](docs/agent/progress.md): current status and open questions. Read this first in a new session.
- [`spec.md`](docs/agent/spec.md): the v1 feature spec.
- [`roadmap.md`](docs/agent/roadmap.md): v2 and v3 plans.
- [`architecture.md`](docs/agent/architecture.md): data flow, storage, auth and folder boundaries.
- [`conventions.md`](docs/agent/conventions.md) and [`ui.md`](docs/agent/ui.md): code and UI rules.

## Third-party assets

Music and ambient audio are third-party. Per-file licences and attribution requirements are in [`MUSIC_LICENSES.md`](MUSIC_LICENSES.md) — check it before adding audio.
