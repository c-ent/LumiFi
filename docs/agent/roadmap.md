# Roadmap

Read this when starting or planning a feature, or when asked what comes next. Each item is the spec for one big feature. They ship one at a time. Build only the item marked Current in `progress.md`. The order is proposed and the owner can change it.

## How to use an item

- Build the current item only. Do not start a related one because it looks easy.
- Resolve the item's Open questions with the owner before writing code. Add any new ones to `progress.md`.
- Reward rules (XP, drops, quest payouts) follow the `change-progression-rules` skill. New tables follow `add-supabase-table`.
- When an item ships, move it to Completed in `progress.md` and update `spec.md` so it describes the app as it is.

## Reward eligibility

Applies to streaks, session quests and achievements. Only a focus session of at least a minimum length counts. Today the spec allows 1 minute sessions, which would let a user earn rewards by repeating very short sessions.

Open question for the owner: the minimum length (a starting point to discuss is 10 minutes). When decided, update the progression rules in `spec.md` and the `change-progression-rules` skill before building any item that grants a reward.

## Order

The order was decided on 2026-11-03 and is recorded in `progress.md`. Only #1 and #8 are scheduled. The other items are kept as specs and stay unscheduled until those two ship.

| #   | Feature                                 | Version | Status                      | Depends on                    |
| --- | --------------------------------------- | ------- | --------------------------- | ----------------------------- |
| 1   | Your own music files                    | v2      | Next                        | v1 music player               |
| 2   | Unlocks (XP lights the room)            | v2      | Unscheduled                 | v1                            |
| 3   | Goal-linked quests                      | v2      | Unscheduled                 | v1                            |
| 4   | Calendar stats                          | v2      | Unscheduled                 | v1 daily minutes history      |
| 5   | Accounts and sync                       | v4      | Unscheduled                 | v1 to v3 shipped, enough users, a moderation plan |
| 6   | Study pets                              | —       | Out                         | v1 (server drops after #5)    |
| 7   | Achievements                            | v2      | Unscheduled, after #5       | #5                            |
| 8   | Streaming playlists                     | v2      | After #1                    | #1, terms check               |
| 9   | Optional cosmetics or one-time purchase | v3      | Unscheduled                 | #2                            |
| 10  | Private circles (friends' candles)      | v4      | Unscheduled                 | #5                            |
| 11  | Focus rooms                             | v4      | Unscheduled                 | #5, #10, users and moderation |

Your own music files is next, and streaming playlists follows it. Streaming still needs a terms check before any code, but it no longer waits on the other v2 items, which are unscheduled.

## v2

### 1. Your own music files

Source: custom playlists are the top request. This is the safe half of it. Streaming services are #8.

Behavior:

- The user picks audio files from the device. They join the music player next to the bundled tracks and play with the screen off.
- Files stay on the device. They are never uploaded or stored in database rows.

Done when:

- The playlist survives restart, a missing file is skipped without a crash, and it plays offline.

Open questions: how to read files on Android (a document picker or a storage permission; both need approval first). Behavior on web. Supported formats. One playlist or several.

### 2. Unlocks (XP lights the room)

Source: research says people like earning things, so XP should unlock something they can see.

Behavior:

- Levels unlock moods, candle or lamp styles and room items such as extra candles.
- No currency by default. XP and levels only.

Done when: unlock rules are pure functions with tests, and locked items show how to unlock them.

Open questions: which item unlocks at which level. Whether v1 moods start all unlocked. Whether a coin currency is wanted.

### 3. Goal-linked quests

Source: research suggests tying quests to real goals such as "finish chapter 5" or an exam date, so progress is more than minutes.

Behavior:

- A goal has a title, an optional date (for example an exam) and an optional target in focus sessions or minutes.
- A task can link to a goal. Focus sessions on linked tasks count toward the target. The goal shows progress and days left.
- Daily quests stay as they are. This is not a planner: no calendar, subtasks or notes.

Done when: progress math is a pure function with tests (including the date passing), and completing a goal awards XP once.

Open questions: XP for a goal. Maximum active goals. What happens after the date passes.

### 4. Calendar stats

Source: "Daywise study time tracker and streaks", a simple calendar of hours studied.

Behavior:

- A month calendar shades each day by minutes studied. Tapping a day shows minutes and sessions. The streak is visible.
- Reads the per-day minutes that v1 stores without pruning.

Done when: a month with gaps, a month boundary and a timezone change render correctly in tests.

Open questions: shading steps. Whether weekly and monthly totals are shown.

### 5. Accounts and sync

Deferred as of 2026-11-03 to the v4 multiplayer work, where it is the first step rather than a standalone v2 item. It is not "waiting for" rooms: #10 and #11 depend on it, so it ships before them. Nothing here is scheduled until the v4 preconditions below are met.

Behavior:

- Sign up and sign in with Supabase Auth. The app offers it after the first completed session. Local-only use keeps working.
- On first sign-in, upload local progress. XP, level, streak and quest rewards change only through validated server functions.

Done when:

- A second device shows the same XP, streak, tasks and settings.
- The client cannot write XP or streak directly. Two-user RLS test passes.

Open questions: sign-in methods (email, Google). Merge rule when the device and the account both hold progress.

### 6. Study pets

Out as of 2026-11-03. Kept here only as a record of what was proposed; do not build it.

Behavior:

- After a completed focus session there is a random chance to receive a pet from a fixed collection. Starting list from research: pet rock, lizard, snake, hamster, bird.
- A Pets screen shows what the user owns. Skipped or reset sessions never drop a pet, and neither do sessions below the minimum length (see Reward eligibility).
- The drop is a pure function in `src/core` that takes a random source, so tests can fix the outcome. After accounts ship, drops are decided and stored on the server.

Open questions: drop chance, and whether it grows with session length. Duplicates: allowed or not. Collection only, or pets appear in the candle scene. Whether pets level up. Who makes the art.

### 7. Achievements

Listed in the original v2 scope but not designed. Needs a list of achievements, how they are earned and whether they award XP before any build. Depends on accounts so they are server-validated.

### 8. Streaming playlists (YouTube, Spotify and so on)

Source: the top request, "input our own playlists or songs from YouTube, Spotify and so on", and "would work so well in study groups".

Before any code: the owner decides to do it, and someone reads each service's current terms on embedding, background playback, required subscriptions, and Google Play policy. Offline download of streamed audio is probably not allowed, so check before promising it.

Open questions: which services. Playback inside the app or handing off to the service's app. Whether links can be shared in rooms.

## v3

### 9. Optional cosmetics or one-time purchase

The core timer, tasks, sounds and progression stay free, because reviewers complain about paywalled features. Ask first before anything paid. Open: model, store billing, what counts as cosmetic.

## v4 (last version: multiplayer)

Everything here needs other people using the app. Do not start v4 until v1 to v3 have shipped, there are enough users, and there is a plan for moderation.

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

iOS release, app blocking, flashcards, planners, notes (one competitor is called a "Notion wannabe"), ads, tracking SDKs, extra languages, study pets (out as of 2026-11-03; see the Evidence table for the request it would have met).

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
| Progress gives nothing | XP unlocks and goals | v2 #2, #3 |
| Harsh alarm at the end | Flame dims, soft chime, "Later" | v1 |
| No live accountability among friends | Friends' candles | v4 #10 |
| Paywalled features, feature creep | Free core, no notes or planner | principle |
| Web apps need a connection | Local-first, bundled audio, own files offline | v1, v2 #1 |
| Generic filler music | Original or commissioned lofi | v1 |
