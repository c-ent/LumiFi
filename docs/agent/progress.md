# Progress

Read at the start of every session. Update after each meaningful change. Keep it short.

## Current phase

v2

## Current feature

Google Play release (owner request, 2026-11-09). Background scenery is built (video and pixel-art videos, 2026-11-10); see Next up for the release steps.

## Current goal

Ship the first Google Play release. #1, #3, #4, and #8 have shipped. #2 (Unlocks) was removed by the owner on 2026-11-04. On 2026-11-10 the owner dropped cosmetics, accounts and sync, private circles and focus rooms from the plan; do not start them.

## Completed

Moved to [completed.md](completed.md). Add new entries there.

## Not yet completed

- Google Play release (current). See Next up.

## In progress

- Nothing.

## Next up

Google Play release, in this order:

1. Owner: trademark and store-name search for Wickglow (Li-Fi is an existing term for light-based wireless).
2. Owner: write and host a privacy policy. It must say the Spotify embed sets cookies, including third-party ones, and how to manage them, and it must cover Supabase data.
3. Owner: create the Play Console developer account ($25 one time).
4. Confirm the licence of the three pixel-art videos in `assets/backgrounds/pixel-art`, as the other bundled media is already cleared (add a row to `MUSIC_LICENSES.md` or the equivalent).
5. Check the final Android manifest: no microphone permission, and no new permission, ads or tracking without the owner's go-ahead.
6. Store listing: name, short and full description, icon, feature graphic, screenshots.
7. Data Safety form, content rating and target audience.
8. Release build: `eas build --platform android` (an `.aab`, R8 minified). Test it on a device, because a debug build does not show R8 problems.
9. Closed test: 12 testers for 14 consecutive days (personal accounts created after 13 November 2023). Start as soon as the build is ready, since the 14 days cannot be shortened.
10. `eas submit` to production.

Run the device checks in "Still to check" during the closed test.

Out of scope by owner decision, 2026-11-10: cosmetics, accounts and sync, private circles, focus rooms, achievements.

## Open questions

- Play release: the privacy policy URL, the store name after the trademark search, and the developer account. Owner: project owner.
- Spotify widget terms. The terms require a privacy policy that tells people the embed sets cookies, including third-party cookies, and how to manage them. Wickglow has no privacy policy yet. Needed before release if Spotify embeds ship. Owner: project owner.
- More background scenes beyond the video and the three pixel-art videos. Not needed for release. Phone and tablet currently show no pixel art. Owner: project owner.
- Shared themes. Phone and desktop will use one set of about five or six, with near-duplicates merged (Ember is close to Amber, Midnight close to Moonlit). Each platform picks its own default. The current build still keeps desktop scenes and phone moods separate. The exact mapping is still open: the palettes are in `components/wickglow/theme.ts` and the mood table in `ui.md`. Not a release blocker. Owner: project owner.

## Still to check

- In a browser and on a device: the focus chip under the timer on all three layouts. With no task it should read "Pick a task to focus on" in a dashed pill with a task glyph and the layout accent; pick a task and it should become a solid washed pill with that task's title, in focus mode only. Pressing it should open the task list on phone (Tasks tab) and desktop (Tasks card), and on tablet it should render as a plain pill, since the task list is already beside it. A break should keep the plain muted line, and the chip should fade with zen like the rest of the controls.
- In a browser and on a device: the month calendar on all three layouts. Check a month with gaps, an empty month, and the arrows past a year edge; the shade steps at 24, 25, 59 and 60 minutes; the today marker and the tapped-day line; and that the four-step tint reads on the dark ground on both the phone mood accent and the desktop scene accent. Check that the next arrow stops at the current month, that a future day is dimmed and does not respond to a tap, and that today is still tappable late in the evening. Tap several empty days in a row and check the quiet line changes between them, and that it does not appear on a day with minutes. The month total should still read as minutes and sessions even when the month is empty.
- In a browser: the desktop dock's Quests button and the top-right pills. The star should open the daily quests card, each pill should open the progress card, and the unclaimed-quest dot should follow the star. Check the quests card at a narrow desktop width and at 1920.
- In a browser and on a device: the task list on all three layouts. Add a task with and without a due date, click the title to focus it and check the target beside edit goes muted to accent, press the target to clear it, and check a task with a due date still shows that date. Edit the title, and delete it. Add subtasks, check the last one, and check that the task finishes and the daily task quest counts once. Uncheck a subtask and check the task opens again. A date before today should read as overdue. On web the date is the calendar button. Restart and check the tasks, the due date, and which list is open are still there. An old save that had goals should still show its tasks.
- On a device: a real stream embed, the Android handoff when an embed cannot play, and that YouTube audio stops with the screen off. Check that no embed offers a way to shrink or collapse it and that each one opens at its full height. On the desktop music card the frame still fills its slot, so the card should not jump when a player opens.
- In a browser and on a device: the repeat toggle. Turn it on with a short track and check the track restarts without advancing; turn it off and check the next track plays at the end; turn it on, change track, and check it is still on; restart the app and check it is still on.
- On a device: picking an own music file, and screen-off playback of that file.
- In a browser: the Full screen button. It should be absent on a phone or tablet browser where the API is missing, and toggle the scene on desktop Chrome.
- On a device: that the music starts with the timer now that `begin` plays the track before the notification work. Web is measured in Chrome over CDP; the native ordering change is not yet checked on hardware.
- Listen to the wind loop. It is a 12.8-second single gust with no crossfade, so it may pulse when it repeats.
- Before production: a Play closed test with 12 testers for 14 consecutive days (personal accounts created after 13 November 2023), and a release build. SDK 58 minifies with R8, so a debug build is not enough.
