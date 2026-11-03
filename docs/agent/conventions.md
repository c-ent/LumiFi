# Conventions

Read this when unsure how something is done here. Only rules that the linter, formatter and tsconfig do not enforce. Timer, notification, audio, navigation and env rules are in `AGENTS.md`.

## Expo and React Native
- Animate with Reanimated on the UI thread. Do not drive animation with `setInterval` and state.
- Ask for the Android notification permission when the user starts their first session, after creating the notification channel. Do not ask on launch.
- Decide layout from `useWindowDimensions`, not from device type. Web uses the window width. On Android and iOS, a window whose shorter side is at most 840 never uses the desktop scene, so turning the device shows the tablet layout once the width is at least 600.
- Before importing a helper from `react-native`, check that `react-native-web` exports it. `react-native-web` trails `react-native`, so a name that exists on one can be `undefined` on web. `useAnimatedValue` is the known case and lives in `hooks/use-animated-value.ts`; if another is needed, add a local hook the same way. Typecheck passes either way, because `react-native`'s types declare the export, so check the browser or the exported bundle, not only `tsc`.

## Supabase
- Check `error` before using `data`. Every call returns `{ data, error }`.
- Validate unknown input (Supabase rows, stored JSON) at the boundary. Do not add a validation library without asking.

## Data and storage
- Audio and other large files go in assets or file storage, not in database rows.
