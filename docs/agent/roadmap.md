# Roadmap

Read this when starting or planning a feature, or when asked what comes next. Each item is the spec for one big feature. They ship one at a time. Build only the item marked Current in `progress.md`. The order is proposed and the owner can change it.

## How to use an item

- Build the current item only. Do not start a related one because it looks easy.
- Resolve the item's Open questions with the owner before writing code. Add any new ones to `progress.md`.
- Reward rules (XP, drops, quest payouts) follow the `change-progression-rules` skill. New tables follow `add-supabase-table`.
- When an item ships, move it to Completed in `progress.md` and update `spec.md` so it describes the app as it is.

## Reward eligibility

Applies to the streak and the four-session quest. Only a focus session of at least 10 minutes counts for those. A shorter session still pays 2 XP per minute and its minutes still count toward the 60-minute quest. The task quest is unchanged: 30 XP once per day.

## Order

The order was updated on 2026-11-03 and is recorded in `progress.md`. #1, #4 and #8 have shipped (#4 on 2026-11-04). #2 and #3 were removed by the owner on 2026-11-04. #6 and #7 are out. #5, #10, and #11 are last.

| #   | Feature                                 | Version | Status                      | Depends on                                                |
| --- | --------------------------------------- | ------- | --------------------------- | --------------------------------------------------------- |
| 1   | Your own music files                    | v2      | Shipped 2026-11-03          | v1 music player                                           |
| 8   | Streaming playlists                     | v2      | Shipped 2026-11-03          | #1, terms check                                           |
| 2   | Unlocks (XP lights the room)            | —       | Removed 2026-11-04          | —                                                         |
| 3   | Goal-linked quests                      | —       | Removed 2026-11-04          | —                                                         |
| 4   | Calendar stats                          | v2      | Shipped 2026-11-04          | v1 daily minutes history                                  |
| 9   | Optional cosmetics or one-time purchase | v3      | Unscheduled                 | —                                                         |
| 6   | Study pets                              | —       | Out                         | v1 (server drops after #5)                                |
| 7   | Achievements                            | —       | Out                         | —                                                         |
| 5   | Accounts and sync                       | v4      | Unscheduled                 | v1 to v3 shipped, enough users, a moderation plan         |
| 10  | Private circles (friends' candles)      | v4      | Unscheduled                 | #5                                                        |
| 11  | Focus rooms                             | v4      | Unscheduled                 | #5, #10, users and moderation                             |

#1, #4 and #8 have shipped. #2 and #3 were removed. #6 and #7 are out. #5, #10, and #11 are last.

## v2

### 1. Your own music files — shipped 2026-11-03

Source: custom playlists are the top request. This was the safe half of it. Streaming services are #8.

Behavior:

- The user picks audio files from the device. They join the music player next to the bundled tracks and play with the screen off.
- Files stay on the device. They are never uploaded or stored in database rows.

Shipped: bundled tracks first, own files appended, all through the one `expo-audio` player. A document picker (`expo-document-picker`, SAF, no new permission) and a copy into the app's private document folder (`expo-file-system`). A missing or unreadable file is skipped. The web build hides the button, since a browser pick is a `blob:` URL that does not survive reload. Pure logic in `src/core/own-tracks.ts`.

### 2. Unlocks (XP lights the room) — removed 2026-11-04

Removed by the owner on 2026-11-04, along with the catalog, the Room panel and the
room art it shipped. XP still levels up and still drives the level name in the
stats surface; it no longer lights extra lights in the room. Kept here only as a
record of what was built and then taken out; do not rebuild it.

### 3. Goal-linked quests — removed 2026-11-04

Removed by the owner on 2026-11-04, along with the goal list, the 40 XP reward, and the link from a task to a goal. Tasks remain, now with an optional due date and subtasks. Kept here only as a record of what was built and then taken out; do not rebuild it.

Shipped, then removed: `src/core/goals.ts` held the pure rules. A goal was a title, an optional local date and an optional target in sessions or minutes. At most 3 active goals. A task carried one `goalId`, and a focus session of at least 10 minutes on that task credited the goal. Reaching a target, or closing a goal with no target, granted 40 XP once. The reward-eligibility minimum applied to goals alone and left with them.

### 4. Calendar stats — shipped 2026-11-04

Source: "Daywise study time tracker and streaks", a simple calendar of hours studied.

Behavior:

- A month calendar shades each day by minutes studied. Tapping a day shows minutes and sessions. The streak is visible.
- Reads the per-day minutes that v1 stores without pruning.

Done when: a month with gaps, a month boundary and a timezone change render correctly in tests.

Shipped: `src/core/month-calendar.ts` holds the pure rules. `monthGrid(now, days, year, month)` returns six padded weeks of cells, each with its local key, minutes and sessions; a day with no history entry is a gap with zero minutes rather than a missing cell, and the adjacent-month days that pad the first and last weeks are marked and left out of the month's own total, so the grid is the same height in every month. `monthShade` is the four-step rule: nothing, 1 to 24, 25 to 59, and 60 minutes or more. `shiftMonth` builds from the first of the month, so the arrows never stop at a year edge. Dates are built with `new Date(year, monthIndex, day)` and read back through `calendarKey`, so a local midnight or a DST hour cannot slip a day into the next cell. The `MonthCalendar` panel sits on the stats surface on all three shells, directly under the 7-day chart on phone and desktop and closing the tablet side column. It draws the cells, the streak in the header and the month total under the grid; the arrows change only the displayed month, today is marked, and the tapped day's line is derived from the same cell rather than a second copy of the history. Tests cover a gap inside the month, the month and year boundary, a padding day from an adjacent month, a local midnight, and the shade steps.

Open questions, answered by this build: four shading steps at 1, 25 and 60 minutes, the deepest in the layout accent. There is no weekly total; the header carries the streak and the month total sits under the grid.

### 6. Study pets

Out as of 2026-11-03. Kept here only as a record of what was proposed; do not build it.

Behavior:

- After a completed focus session there is a random chance to receive a pet from a fixed collection. Starting list from research: pet rock, lizard, snake, hamster, bird.
- A Pets screen shows what the user owns. Skipped or reset sessions never drop a pet, and neither do sessions below the minimum length (see Reward eligibility).
- The drop is a pure function in `src/core` that takes a random source, so tests can fix the outcome. After accounts ship, drops are decided and stored on the server.

Open questions: drop chance, and whether it grows with session length. Duplicates: allowed or not. Collection only, or pets appear in the candle scene. Whether pets level up. Who makes the art.

### 7. Achievements

Out as of 2026-11-03. Kept here only as a record of what was proposed; do not build it.

Listed in the original v2 scope but not designed. It would have needed a list of achievements, how they are earned, and whether they award XP, and it would have depended on accounts so rewards were server-validated.

### 8. Streaming playlists — shipped 2026-11-03

Source: the top request, "input our own playlists or songs from YouTube, Spotify and so on".

Terms read 2026-11-03, before the code:

- YouTube (API Services Developer Policies and Required Minimum Functionality): the embedded player stays visible, at least 200px tall here, with autoplay and the IFrame Player API left off. Background playback and separating the audio are forbidden, and Google Play has rejected apps whose WebView keeps YouTube audio after the screen locks. The player is removed when Wickglow leaves the screen. No offline copy.
- Spotify (Embeds and the Widget Terms): the iframe is Spotify's player, not the Web Playback SDK. Signed out, playback is a short preview. Full tracks need the listener's own Spotify session inside that player, which needs `encrypted-media` on the frame. The widget terms are written for a website the developer controls and require a privacy-policy disclosure that the embed sets cookies. That disclosure is still an open question in `progress.md`. No sign-in is built by Wickglow.
- Apple Music (the embeddable player, not MusicKit): `embed.music.apple.com`. Signed out, a short preview. Full tracks need the listener's own Apple Music session inside that player. MusicKit would be a playback SDK and a sign-in, so it is not used.
- YouTube Music: no embed and no oEmbed. A `music.youtube.com` link is stored and opened. A normal `youtube.com` playlist is the YouTube player.

Shipped: paste a public link. The save stores the link and the service name. The music panel splits Tracks and Streaming, and adding a link opens that service's player immediately. Spotify, YouTube, and Apple Music show that service's player on the scene, so it keeps playing when the panel closes or the ambient mixer opens. The player keeps its default height and cannot be collapsed; the owner removed Minimize on 2026-11-07. On the web, Spotify and Apple Music keep playing in a hidden browser tab. YouTube's frame still leaves when the page is hidden, and on Android and iOS every embed still leaves when the app leaves the screen. YouTube Music opens. Starting an embed pauses the local `expo-audio` player, and closing it can resume. A private or unrecognized link fails with a short message. If the embed cannot play on Android, the link opens in that service's app. Session-end volume and fade stay on the local player. The timer, XP, and quests stay on the session clock. Pure parsing is in `src/core/stream-links.ts`.

Open questions: whether links can be shared in rooms. The privacy-policy line Spotify's widget terms ask for, before release.

## v3

### 9. Optional cosmetics or one-time purchase

The core timer, tasks, sounds and progression stay free, because reviewers complain about paywalled features. Ask first before anything paid. Open: model, store billing, what counts as cosmetic.

## v4 (last version: multiplayer)

Do not start v4 until v1 to v3 have shipped, there are enough users, and there is a plan for moderation. Accounts and sync is the first step here, and it ships before private circles and focus rooms. Circles and rooms need other people using the app.

### 5. Accounts and sync

Deferred as of 2026-11-03 to this v4 work, where it is the first step rather than a standalone earlier item. It is not "waiting for" rooms: #10 and #11 depend on it, so it ships before them. Nothing here is scheduled until the preconditions above are met.

Behavior:

- Sign up and sign in with Supabase Auth. The app offers it after the first completed session. Local-only use keeps working.
- On first sign-in, upload local progress. XP, level, streak and quest rewards change only through validated server functions.

Done when:

- A second device shows the same XP, streak, tasks and settings.
- The client cannot write XP or streak directly. Two-user RLS test passes.

Open questions: sign-in methods (email, Google). Merge rule when the device and the account both hold progress.

### 10. Private circles (friends' candles)

An idea from the research author, not validated by users.

Behavior: a small invite-only group. Each friend's candle burns while that friend is in a focus session. No chat by default.

Open questions: how invites work. Whether presence can be hidden. Whether friends get notified.

### 11. Focus rooms

Do not start until there are enough users, moderation and a community. Must-haves from the research:

- Transfer host: the host can hand the role to another member. If the host leaves or is removed, the role passes on and the room and its Pomodoro timer are not lost.
- Chat can be turned off. No red unread dot or badge ever shows during a focus phase.
- Shared playlist for study groups, which needs #8.

Open questions: who becomes host when nobody is named. Rules for removing members. Reporting and blocking.

## Not planned

iOS release, app blocking, flashcards, planners, notes (one competitor is called a "Notion wannabe"), ads, tracking SDKs, extra languages, study pets (out as of 2026-11-03; see the Evidence table for the request it would have met), achievements (out as of 2026-11-03).

## Evidence

Source: a competitor's feature request board and a gap analysis, shared by the project owner. The board is not named in the source file. Votes were read at the time of research and will change.

| Request                                   | Votes | Board status | Lands in                    |
| ----------------------------------------- | ----- | ------------ | --------------------------- |
| Task list for daily tasks                 | 122   | none shown   | v1 Tasks                    |
| Study pets, random pet reward             | 114   | none shown   | Out as of 2026-11-03        |
| Daywise study time tracker and streaks    | 9     | none shown   | v1 streak and 7 days, v2 #4 |
| Personalized end-of-session messages      | 134   | Planned      | v1 Session-end messages     |
| Custom songs playlist                     | 342   | Active       | v2 #1, v2 #8                |
| Change music behavior when the timer ends | 87    | Active       | v1 Sound                    |
| Clock ticking ambient sound               | 50    | Active       | v1 Sound                    |
| Turn off chat, the red ball hurts lock-in | 45    | none shown   | v4 #11                      |
| Transfer host                             | 38    | Active       | v4 #11                      |

Gaps to beat, from the same research:
| Gap | Lumiere answer | Lands in |
| --- | --- | --- |
| No reliable Android app with a timer that survives a locked screen | Timestamp timer and scheduled notification | v1 |
| Progress gives nothing | XP levels and daily quests | v1 |
| Harsh alarm at the end | Flame dims, soft chime, "Later" | v1 |
| No live accountability among friends | Friends' candles | v4 #10 |
| Paywalled features, feature creep | Free core, no notes or planner | principle |
| Web apps need a connection | Local-first, bundled audio, own files offline | v1, v2 #1 |
| Generic filler music | Original or commissioned lofi | v1 |

The first gap is research, not marketing copy. Do not write "no reliable Android app" in store or site text until the Play Store has been checked, and prefer a feature claim even then.
