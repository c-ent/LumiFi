# Progress

Read at the start of every session. Update after each meaningful change. Keep it short: what is current, what is open, and what still needs checking. Finished work goes in [completed.md](completed.md).

## Current phase

v2

## Current feature

Google Play release (resumed 2026-11-14, after the owner marked accounts and saving done). Steps under Next up.

## Current goal

Ship Wickglow on Google Play. Cosmetics, private circles and focus rooms stay out of scope.

## Not yet completed

- Google Play release (current). See Next up.
- `expo-dev-client` is still in release builds (needed for the dev profile, not yet changed).
- C1 from [../issues.md](../issues.md): the uncleared videos.

## Open questions

- Sign-out with unsaved progress (2026-11-14, not built): instead of removing it after the warning, the device could keep the unsaved part aside under that account's id and send it the next time the same account signs in here, never to another account. Needs extra save fields and sync logic. Owner to decide if it is wanted.
- Target audience: decided 2026-11-14 (owner): 13 and over, to stay out of Play's Families policy. The privacy policy says Wickglow is not directed at children under 13. In the Play Console's target audience form, pick only 13+ age groups and answer "no" to appealing to children.
- Security (2026-11-14): `npm audit` reports 0 vulnerabilities through `overrides` in `package.json` (`@grpc/grpc-js`, `uuid`, `re2`, `@opentelemetry/core`, `glob`), all transitive copies in dev-only `firebase-tools`; the app bundle is unaffected. Do not run `npm audit fix --force`: it downgrades `firebase`/`firebase-tools` to older majors. Re-check the overrides when `firebase-tools` resolves them itself.
- Play release: the privacy policy URL, the store name after the trademark search, and the developer account.
- Spotify widget terms: they require a privacy policy that says the embed sets cookies, including third-party ones, and how to manage them. Needed before release if Spotify embeds ship.
- The Apple Music card that floats bottom-right on desktop after the Music panel closes, with a "Find stream" button: keep it or not?
- Before release: do `assets/backgrounds/videos/original/` (about 290 MB) and `backup/` stay in the repo?
- More background scenes. Not needed for release; phone and tablet show no pixel art.

## Next up

In this order:

1. Owner: trademark and store-name search for Wickglow.
2. Privacy policy: drafted in `public/privacy.html` (2026-11-14). Owner: review and deploy it, check `https://wickglow.vercel.app/privacy` loads, then put that URL in the Play Console. Also check the email-based account deletion (`/delete-account`) against Play's current policy.
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

APK builds until then: `eas build --platform android --profile preview` (sideloadable APK, same EAS keystore Play will use, so do not delete it). EAS pins Node 24.12.0. If your npm config has `legacy-peer-deps=true`, remove it (`npm config delete legacy-peer-deps`) or `npm ci` on EAS fails. EAS project: `@cent_1214/wickglow`. The 13 Expo patch updates (2026-11-14) changed native modules, so the next APK needs a fresh EAS build.

Out of scope by owner decision, 2026-11-10: cosmetics, private circles, focus rooms, achievements.

## Still to check

### On an Android device (needs a fresh APK)

- Build: a development build installs and runs on the Xiaomi Pad 6 (arm64-only `buildArchs`); the preview APK is smaller than before (107 MB).
- Keyboard: on the phone sheet, a task and a subtask field stay above the keyboard; on tablet, the side column's task fields too, and typing keeps focus; on a large tablet in landscape (desktop layout), a task, a subtask edit near the bottom of the Tasks card, and a duration field in Timer settings stay above the keyboard. Tablet zen waits while the keyboard is up. Stuck-keyboard fix (2026-11-14): type in the sign-in card, then Continue with Google, back out or finish: Progress and the side cards (Scenes) return to full height. Account menu: Edit name, then Cancel, Save or tap outside: the keyboard closes and Progress drops back. While editing the name, the menu moves up to end above the keyboard (Delete account visible, or reachable by scrolling) and returns under the chip when the keyboard closes. Sign-in card in landscape with the keyboard up: its top stays on screen and it scrolls.
- Icon and splash: the icon looks right; the splash shows the whole round logo, sharp, on phone and tablet (if too small, raise `imageWidth` for `expo-splash-screen` in `app.json`).
- Music: all 14 tracks play, play into the next one, and keep playing with the screen off; the seek bar counts up, a drag seeks, and it resets on a track change; the volume slider works and a track picked at low volume stays low; repeat on restarts the track, off advances, and it survives an app restart; the music starts with the timer.
- Own music files: picking one plays it, also with the screen off; the cache holds no second copy; a pick where every copy fails shows "Could not add those files".
- Ambient: each loop starts when its slider leaves zero, repeats with no click or gap (Clock, Rain, Waves, Fireplace first), and keeps playing with the screen off; the lock-screen card reads "Ambient" when only ambient plays; a slider level is kept if the app is closed right after dragging. Listen to Wind: it is a 12.8 s gust and may pulse when it repeats. Ambient effects (rain, embers, fireflies, waves) stay smooth with all of them on.
- Timer and session end: the time changes every second with no skipped or doubled second, and the candle burns down; the flame flickers; the halo sits on the flame, has no hard edge and dims on pause. A session ending with the app open and with it closed completes once and shows the end card; the chime and notification sound are unchanged and still arrive after several sessions in a row; on Android 12 and 13+ the alarm fires on time, and on 13+ the app is not under "Alarms & reminders". Fresh install: press Start and answer the notification prompt slowly, the timer was already counting. Start then Reset quickly: no notification arrives later. Auto-start with "Lower the volume" or "Fade out and stop": the break starts with the music at full volume. Changing the focus length mid-session does not make the candle jump. Ticking a task on and off quickly keeps the count, quest and toast right.
- Phone layout: five tabs (Tasks, Sounds, Stats, Mood, Timer) fit, with the quest dot on Stats; Sounds shows Tracks and Ambient only, with no space reserved for a player; Stats and Calendar switch, the calendar and the quest tiles scroll clear of the tab bar; Mood shows seven themes three to a row with Tide at the left under Violet (and Tide plus Video on the left two cells on tablet), and the round swatches read well; the cards (player, quests, three timer settings cards, Last 7 days) line up; the larger section titles do not crowd; the "When a session ends" rows are the same size. The sheet closes from its tab, close button, handle and the dimmed area; the handle and mini timer show while it slides; TalkBack skips the closed sheet. Zen fades the tab bar and it cannot be tapped. The pills and level ring open Stats. On a small phone (about 640 high) the candle has room. The glass reads clear and the sheet text is readable without blur.
- Tablet layout: Sounds shows the tracks with no tabs; the side column reads Tasks, Sounds, mixer, quests, stats, calendar, timer settings; the task list uses two rows; the Video mood card's spinner fits.
- Large tablet in landscape (desktop layout, needs the Vercel deploy): a remote scene tile shows its size, a tap shows the percentage and then plays it; it still plays in airplane mode; with the network off a tap shows "Tap to retry"; closing the app mid-download leaves no broken scene; tapping another tile during a download keeps that tile selected. On a phone or tablet with a remote video saved from desktop, Classic plays.
- Backgrounds and fonts: video playback is smooth; switching shows no black flash and settles on the last pick; fonts are right from the first frame.

### Web black screen fix

- Run `npx expo start --web` and open it: the app shows (not a black screen). After the next Vercel deploy, the live site still loads.

### Accounts

- Reads: Firebase console, Firestore, Usage. Reopening the app with nothing new should add only a read or two.
- Sign-out clears the device (2026-11-14): signed in and saved, Sign out is immediate and the app shows level 1 with no tasks, with theme and timer lengths unchanged; signing back in brings the progress back. Sign in as a second, new account: it starts at level 1. Offline (web: DevTools offline; Android: airplane mode), finish a session, then Sign out: "Saving your progress…" for about 4 s, then the warning; Stay signed in keeps everything, Sign out anyway clears it. Back online before the 4 s are up: it signs out by itself.
- Sign-in toast, in the browser and on Android: "Signed in. Your progress saves to your account" after a sign-in, "Account created. Check your email to confirm it" after Create account, nothing on a restored session or a cancelled Google picker.
- After the next deploy: `https://wickglow.vercel.app/privacy` loads.

### In a browser

- Android Chrome (phone and tablet): the task, subtask and task edit fields do not zoom the page and stay above the keyboard; the 16px fields still fit their rows; on a tablet in landscape (desktop layout), the Tasks card stays above the keyboard. iPad or iPhone Safari: the same, and the music plays (needs Safari 18.4+ for Ogg Opus).
- Streaming: phone and tablet widths show no Streaming tab; start a Spotify embed on desktop, narrow the window to phone width, and check it stops and a local track can play.
- Zen wakes on a key press at phone and tablet widths.
- Remote scenes stream and play with no size badge. Reload with a video, a pixel-art picture and a gradient saved in turn: the first pick after each reload shows without a second pick. Under reduced motion the "Loading scene…" pill shows words only.
- Themes: seven scene tiles and seven mood cards with the same names, order and colours, each distinct; old saves with `dusk`, `spirit`, `midnight` or `ember` load as Amber; the front desktop orb reads as a dark shape.
- Calendar: arrows past a year edge; an empty month still reads its total in minutes and sessions; tapping several empty days in a row changes the quiet line, which never shows on a day with minutes.
- Tasks: the focus target goes muted to accent and clears; finishing the last subtask finishes the task and counts the daily quest once; unticking a subtask reopens it; an old save that had goals still shows its tasks.
- Focus chip: pressing it opens the task list on phone and desktop; on tablet it is a plain pill; breaks show the muted line; it fades with zen.
- Lucide icons (2026-11-14): every icon on phone, tablet and desktop, and the mixer knobs against the still mixer icon.
- Desktop: the left group stays clear of the right group at a narrow desktop width (about 860); the Quests card at a narrow desktop width and at 1920; the Music card's stream player sits on its slot at once; the Full screen button is absent on phone and tablet browsers that lack the API.

### Known issues to look at

- Dev console warns "React does not recognize the `accessibilityElementsHidden` prop" (and `importantForAccessibility`), probably from `StreamServiceMark` in `components/wickglow/shared/stream-marks.tsx:28-29`.
- In a 2026-11-13 browser pass, only one of three saved stream links survived a reload, and a paused focus session was found running after a reload. Causes not checked.
- Dev saves that already moved to records keep their old day totals and may count a still-listed task twice on that one day (from the PR #13 review, 2026-11-14).
