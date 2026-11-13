# Progress

Read at the start of every session. Update after each meaningful change. Keep it short: what is current, what is open, and what still needs checking. Finished work goes in [completed.md](completed.md).

## Current phase

v2

## Current feature

Accounts and saving with Firebase (owner request, 2026-11-13). Comes before the Google Play release, which is paused until this is done. Blocked until the owner approves the Firebase dependency and the auth change (Ask first in AGENTS.md); see Open questions.

## Current goal

Add accounts and saving with Firebase, then return to the Google Play release. On 2026-11-10 the owner had dropped accounts and sync; on 2026-11-13 they put it back at the front of the plan. Cosmetics, private circles and focus rooms stay out of scope.

## Not yet completed

- Accounts and saving with Firebase (current, pending approval).
- Google Play release (paused until after accounts and saving). See Next up.
- C1 from [../issues.md](../issues.md): the uncleared videos.

## Open questions

- Accounts and saving (owner, 2026-11-13). Needs owner approval before building: (a) the Firebase dependency and which Firebase services (Auth, Firestore?), (b) the auth change, (c) how this squares with the 2026-11-10 decision to drop accounts and sync, (d) what "savings rate" means (a saving rate for progress or money? Not in the spec). Also check that Firebase does not go against the server-validated rewards rule (XP is validated on the server, never sent as a total from the client); Supabase is the current backend and Firebase would be a second one.
- Play release: the privacy policy URL, the store name after the trademark search, and the developer account.
- Spotify widget terms: they require a privacy policy that says the embed sets cookies, including third-party ones, and how to manage them. Needed before release if Spotify embeds ship.
- The Apple Music card that floats bottom-right on desktop after the Music panel closes, with a "Find stream" button: keep it or not?
- Before release: do `assets/backgrounds/videos/original/` (about 290 MB) and `backup/` stay in the repo?
- More background scenes. Not needed for release; phone and tablet show no pixel art.

## Next up

Paused on 2026-11-13 until accounts and saving are done. Resume in this order:

1. Owner: trademark and store-name search for Wickglow.
2. Owner: write and host a privacy policy. It must cover the Spotify embed's cookies (including third-party ones and how to manage them), Supabase data, and that background scenes are downloaded from the Wickglow site on Vercel, which sees the device's IP address.
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
