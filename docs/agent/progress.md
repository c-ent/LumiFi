# Progress

Read at the start of every session. Update after each meaningful change. Keep it short: what is current, what is open, and what still needs checking. Finished work goes in [completed.md](completed.md).

## Current phase

v2

## Current feature

Accounts and saving with Firebase (owner request, 2026-11-13). Comes before the Google Play release, which is paused until this is done. Owner approved (2026-11-13): the `firebase` package; Auth and Firestore on the free Spark plan; sign-in with Email/Password and Google; "saving" means XP, streaks, tasks and history synced across devices.

Built 2026-11-13 (steps 1 to 6 of [../feature/firebase.md](../feature/firebase.md)): email sign-in, sign-up, reset and verification; Google sign-in (web works, Android code waits on owner tasks); Firestore layout and rules, tested on the emulator; first sign-in with "keep which progress"; ongoing sync; account deletion by email with a page at `/delete-account`. Typecheck, tests, rules tests, lint and both bundles pass (details in the feature doc's "Checks run").

Also 2026-11-13: the read-cost fix the owner chose after a review (fix B with savings 1 to 4): one `records` collection, each device reads only what is new since its last sync, the subtask list and session count are no longer synced, task edits wait 10 s, and deleted-task tombstones are cleared after 30 days. Estimated: about 2,000 to 2,500 active users a day on the free plan, no longer shrinking as history grows (it was about 9 a day after a year). Details and the table: the feature doc's "Read and write costs".

Also fixed 2026-11-13: the web app showed only a black screen. `app/+html.tsx` (added in ba5822c for the keyboard fix) did not render Expo's `headNodes` and `bodyNodes`, so every web build since had no script tags and stayed on the dark loading screen. The live site was deployed before that and still works; the next deploy needs this fix.

Also 2026-11-13: the Android builds include only 64-bit ARM (`buildArchs: ["arm64-v8a"]`), set through `expo-build-properties` in `app.json` (owner approved). The minimum Android version stays at the Expo default. This makes the EAS builds smaller and drops old 32-bit and x86 devices. Check that a development build installs and runs on the Xiaomi Pad 6 (arm64).

Next: the owner tasks below, then the account checks under Still to check. When those pass, the feature moves to completed.md and the Play release resumes.

## Current goal

Add accounts and saving with Firebase, then return to the Google Play release. On 2026-11-10 the owner had dropped accounts and sync; on 2026-11-13 they put it back at the front of the plan. Cosmetics, private circles and focus rooms stay out of scope.

## Not yet completed

- Accounts and saving with Firebase (current, code built). Owner tasks left:
  1. Deploy the Firestore rules: `npx firebase login`, then `npm run deploy:rules`. Until then the live database denies everything, so sign-in works but syncing shows "Could not reach your account".
  2. EAS: the six `EXPO_PUBLIC_FIREBASE_*` vars (`eas env:create`).
  3. Google on Android: Android app in Firebase (`com.cent.wickglow` + SHA-1 from `eas credentials`), `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `.env` and EAS, then a new development build.
  4. Privacy policy: account data in Firebase.
  5. Before release: check the email-based account deletion against Play's current policy.
- Google Play release (paused until after accounts and saving). See Next up.
- C1 from [../issues.md](../issues.md): the uncleared videos.

## Open questions

- Accounts and saving: answered 2026-11-13 (sign-in in Stats; user picks on a merge conflict; Google on Android approved; progress only syncs), recorded in [../feature/firebase.md](../feature/firebase.md). Also answered 2026-11-13: rule caps on XP and streak changes are enough; users request account deletion by email and the owner deletes it by hand after 7 days. No Firebase questions are open. One convention change to confirm: AGENTS.md allowed only the six Firebase values in the client; Google sign-in on Android also needs `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (a public OAuth id, not a secret), so the rule now names it. Say if you want it handled another way.
- Account name (2026-11-13): the account card shows the Firebase Auth profile name (from Google, or the optional "Name" typed at sign-up), else the email. People can change their name from the pencil on the account card (owner, 2026-11-13); an empty name goes back to showing the email. Open: is a username or a profile page wanted? Not built; no Firestore schema change is needed for the name.
- Security (2026-11-14): `npm audit` reports 0 vulnerabilities. Minimal change: the committed `package-lock.json` was kept, with four stale nested `glob` entries removed so npm re-resolves them. Fixes are `overrides` in `package.json`: `@grpc/grpc-js`, `uuid`, `re2`, `@opentelemetry/core` (under `@google-cloud/pubsub`), and `glob` (under `archiver-utils`, `exegesis`, `rimraf`, `firebase-tools`). Direct dependency versions are unchanged. Those are transitive copies in dev-only `firebase-tools`; the app bundle is unaffected. Do not run `npm audit fix --force`: it downgrades `firebase`/`firebase-tools` to older majors. Re-check the overrides when `firebase-tools` releases a version that resolves them itself.
- Play release: the privacy policy URL, the store name after the trademark search, and the developer account.
- Spotify widget terms: they require a privacy policy that says the embed sets cookies, including third-party ones, and how to manage them. Needed before release if Spotify embeds ship.
- The Apple Music card that floats bottom-right on desktop after the Music panel closes, with a "Find stream" button: keep it or not?
- Before release: do `assets/backgrounds/videos/original/` (about 290 MB) and `backup/` stay in the repo?
- More background scenes. Not needed for release; phone and tablet show no pixel art.

## Next up

Paused on 2026-11-13 until accounts and saving are done. Resume in this order:

1. Owner: trademark and store-name search for Wickglow.
2. Owner: write and host a privacy policy. It must cover the Spotify embed's cookies (including third-party ones and how to manage them), account data in Firebase (Google), and that background scenes are downloaded from the Wickglow site on Vercel, which sees the device's IP address.
3. Owner: create the Play Console developer account ($25 one time).
4. Background licences (`BACKGROUND_LICENSES.md`): add the permission text for `frog_lily_pond` (Abi Toads) and Wallper's reply for `cyberpunk_desk`; confirm Wallper's permission covers `snowy_sled`, `mossy_branch` and `night_hills` and add their page links; add the row for `270983_medium.mp4` (Classic, Pixabay) if still missing.
5. Check the final Android manifest: no microphone permission, and no new permission, ads or tracking without the owner's go-ahead.
6. Store listing: name, short and full description, icon, feature graphic, screenshots.
7. Data Safety form, content rating and target audience.
8. Release build: `eas build --platform android` (an `.aab`, R8 minified). Test it on a device, because a debug build does not show R8 problems.
9. Closed test: 12 testers for 14 consecutive days (personal accounts created after 13 November 2023). Start as soon as the build is ready.
10. Owner: apply for production access once the closed test has run 14 days.
11. `eas submit` to production.

Run the device checks below during the closed test.

APK builds until then: `eas build --platform android --profile preview` (sideloadable APK, same EAS keystore Play will use, so do not delete it). EAS pins Node 24.12.0. If your npm config has `legacy-peer-deps=true`, remove it (`npm config delete legacy-peer-deps`) or `npm ci` on EAS fails. EAS project: `@cent_1214/wickglow`.

Out of scope by owner decision, 2026-11-10: cosmetics, private circles, focus rooms, achievements.

## Still to check

### On an Android device (needs a fresh APK)

- Keyboard: on the phone sheet, a task and a subtask field stay above the keyboard; on tablet, the side column's task fields too, and typing keeps focus; on a large tablet in landscape (desktop layout), a task, a subtask edit near the bottom of the Tasks card, and a duration field in Timer settings stay above the keyboard. Tablet zen waits while the keyboard is up.
- Icon and splash: the icon looks right; the splash shows the whole round logo, sharp, on phone and tablet (if too small, raise `imageWidth` for `expo-splash-screen` in `app.json`).
- Music: all 14 tracks play, play into the next one, and keep playing with the screen off; the seek bar counts up, a drag seeks, and it resets on a track change; the volume slider works and a track picked at low volume stays low; repeat on restarts the track, off advances, and it survives an app restart; the music starts with the timer.
- Own music files: picking one plays it, also with the screen off; the cache holds no second copy; a pick where every copy fails shows "Could not add those files".
- Ambient: each loop starts when its slider leaves zero, repeats with no click or gap (Clock, Rain, Waves, Fireplace first), and keeps playing with the screen off; the lock-screen card reads "Ambient" when only ambient plays; a slider level is kept if the app is closed right after dragging. Listen to Wind: it is a 12.8 s gust and may pulse when it repeats.
- Timer and session end: the time changes every second with no skipped or doubled second, and the candle burns down; the flame flickers; the halo sits on the flame, has no hard edge and dims on pause. A session ending with the app open and with it closed completes once and shows the end card; the chime and notification sound are unchanged and still arrive after several sessions in a row; on Android 12 and 13+ the alarm fires on time, and on 13+ the app is not under "Alarms & reminders". Fresh install: press Start and answer the notification prompt slowly, the timer was already counting. Start then Reset quickly: no notification arrives later. Auto-start with "Lower the volume" or "Fade out and stop": the break starts with the music at full volume. Changing the focus length mid-session does not make the candle jump. Ticking a task on and off quickly keeps the count, quest and toast right.
- Phone layout: five tabs (Tasks, Sounds, Stats, Mood, Timer) fit, with the quest dot on Stats; Sounds shows Tracks and Ambient only, with no space reserved for a player; Stats and Calendar switch, the calendar and the quest tiles scroll clear of the tab bar; Mood shows seven themes three to a row with Tide centred, and the round swatches read well; the cards (player, quests, three timer settings cards, Last 7 days) line up; the larger section titles do not crowd; the "When a session ends" rows are the same size. The sheet closes from its tab, close button, handle and the dimmed area; the handle and mini timer show while it slides; TalkBack skips the closed sheet. Zen fades the tab bar and it cannot be tapped. The pills and level ring open Stats. On a small phone (about 640 high) the candle has room. The glass reads clear and the sheet text is readable without blur.
- Tablet layout: Sounds shows the tracks with no tabs; the side column reads Tasks, Sounds, mixer, quests, stats, calendar, timer settings; the task list uses two rows; the Video mood card's spinner fits.
- Large tablet in landscape (desktop layout, needs the Vercel deploy): a remote scene tile shows its size, a tap shows the percentage and then plays it; it still plays in airplane mode; with the network off a tap shows "Tap to retry"; closing the app mid-download leaves no broken scene; tapping another tile during a download keeps that tile selected. On a phone or tablet with a remote video saved from desktop, Classic plays.
- Backgrounds and fonts: video playback is smooth; switching shows no black flash and settles on the last pick; fonts are right from the first frame.

### Web black screen fix

- Run `npx expo start --web` and open it: the app shows (not a black screen). After the next Vercel deploy, the live site still loads.

### Accounts (needs the rules deployed)

- Web: create an account with email; the verification email arrives and the row says "Email not confirmed" until the link is opened and you come back to the tab. Sign out and in; Forgot password sends a link; a wrong password and a short password show their messages. Continue with Google opens the popup and signs in.
- Web, two browsers (or a normal and a private window) on the same account: a finished focus session, a new task, a ticked task and a deleted task show on the other within a few seconds, with the same XP, level, streak and calendar. Edit a task offline in one, then reconnect: it goes up.
- First sign-in: a device with progress on an empty account uploads it; a fresh device on that account takes it; a device with its own progress shows "Keep which progress?", and each choice keeps only that side (the other device follows). "Decide later" and the row's Choose button.
- Firebase console after those: only `users/{uid}/records`, with `s_`, `t_` (and `d_` for an older save) records; no totals. Opening the subtask list writes nothing; several quick task edits arrive as one change about 10 s later, or at once when the tab is hidden.
- Reads: Firebase console, Firestore, Usage. Reopening the app with nothing new should add only a read or two.
- Android (current development build): email sign-in and sync work; the Google button is hidden. After the Google owner tasks and a new build: Google sign-in works and the account picker shows again after sign-out.
- Delete account opens an email with the account's email and id; `https://wickglow.vercel.app/delete-account` shows the page after the next deploy.
- Phone, tablet and desktop: the Account row (new compact layout, 2026-11-13) and both cards fit; a long email shortens in the middle; the status dot is green when saved; the sign-in card stays above the keyboard.

### In a browser

- Android Chrome (phone and tablet): the task, subtask and task edit fields do not zoom the page and stay above the keyboard; the 16px fields still fit their rows; on a tablet in landscape (desktop layout), the Tasks card stays above the keyboard. iPad or iPhone Safari: the same, and the music plays (needs Safari 18.4+ for Ogg Opus).
- Streaming: phone and tablet widths show no Streaming tab; start a Spotify embed on desktop, narrow the window to phone width, and check it stops and a local track can play.
- Zen wakes on a key press at phone and tablet widths.
- Remote scenes stream and play with no size badge. Reload with a video, a pixel-art picture and a gradient saved in turn: the first pick after each reload shows without a second pick. Under reduced motion the "Loading scene…" pill shows words only.
- Themes: seven scene tiles and seven mood cards with the same names, order and colours, each distinct; old saves with `dusk`, `spirit`, `midnight` or `ember` load as Amber; the desktop Scenes grid's last row is centred; the front desktop orb reads as a dark shape.
- Calendar: arrows past a year edge; an empty month still reads its total in minutes and sessions; tapping several empty days in a row changes the quiet line, which never shows on a day with minutes.
- Tasks: the focus target goes muted to accent and clears; finishing the last subtask finishes the task and counts the daily quest once; unticking a subtask reopens it; an old save that had goals still shows its tasks.
- Focus chip: pressing it opens the task list on phone and desktop; on tablet it is a plain pill; breaks show the muted line; it fades with zen.
- Desktop: the Quests card at a narrow desktop width and at 1920; the Music card's stream player sits on its slot at once; the Full screen button is absent on phone and tablet browsers that lack the API.

### Known issues to look at

- Dev console warns "React does not recognize the `accessibilityElementsHidden` prop" (and `importantForAccessibility`), probably from `StreamServiceMark` in `components/wickglow/shared/stream-marks.tsx:28-29`.
- In a 2026-11-13 browser pass, only one of three saved stream links survived a reload, and a paused focus session was found running after a reload. Causes not checked.
