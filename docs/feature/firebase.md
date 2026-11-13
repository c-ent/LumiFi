# Firebase: accounts and saving

The plan for adding accounts and cloud saving to Wickglow with Firebase. It covers what is decided, what is set up, the build steps, and what is still open. Status as of 2026-11-13: steps 1 to 6 are built in code, with the read-cost fix (fix B and savings 1 to 4); what is left needs the owner (see Owner tasks) or a device.

Related: [progress.md](../agent/progress.md) (current status), [architecture.md](../agent/architecture.md) (rules for `src/data` and auth), [roadmap.md](../agent/roadmap.md) (item 5, Accounts and sync).

## Goal

Let a user sign in and keep their XP, streaks, tasks and focus history the same on every device (web and Android). Signing in stays optional: the app keeps working fully without an account.

This comes before the Google Play release, which is paused until it is done.

## Decisions

| Topic | Decision | Why |
| --- | --- | --- |
| Backend | Firebase, replacing the earlier Supabase plan | Owner choice, 2026-11-13 |
| Plan | Spark (free) | No paid services for now |
| Services | Firebase Auth and Cloud Firestore only | Analytics is off: no tracking without a separate decision |
| SDK | Firebase JS SDK (`firebase` 13.3.0) | One SDK for web and Android, no native module or `google-services.json` |
| Sign-in methods | Email/Password and Google | Owner choice |
| What syncs | XP, streaks, tasks and focus history | What "saving" means, per owner |
| Hosting | Stays on Vercel (`wickglow.vercel.app`), not Firebase Hosting | Android downloads background scenes from Vercel, and Spark's hosting transfer (about 360 MB a day) is too small for the videos |
| Reward checks | Firestore security rules | Cloud Functions need the paid Blaze plan. Rules can cap how much XP or a streak changes in one write, but cannot recalculate it on a server |

## Free plan limits to design around

- Firestore: about 50,000 reads, 20,000 writes and 20,000 deletes a day, and 1 GiB stored. Sync on meaningful events (a session ends, a task changes), never every timer tick.
- No Cloud Functions, so no server code. Everything the server enforces has to be in the security rules.
- No scheduled backups (Blaze only).
- Firestore's location is fixed once created.

## Setup status

Done:

- [x] Firebase project `wickglow` created on Spark, Google Analytics off.
- [x] Web app registered (it covers web and Android through the JS SDK). Firebase Hosting left off.
- [x] Authentication: Email/Password turned on.
- [x] Authentication: `wickglow.vercel.app` added to authorized domains (`localhost` is there by default).
- [x] Firestore created in production mode (denies everything until rules are written). No backups.
- [x] `.env` in the project root with the six `EXPO_PUBLIC_FIREBASE_*` values (never committed).
- [x] `firebase` package installed with `npx expo install`.
- [x] Firebase client in `src/data/`:
  - `firebase-config.ts` reads the env values; if any are missing, the app runs local-only.
  - `firebase.ts` (Android) keeps the session in AsyncStorage.
  - `firebase.web.ts` (web) keeps the session in the browser.
- [x] Docs moved from Supabase to Firebase (AGENTS.md, architecture, conventions, roadmap, progress).
- [x] `firestore.rules`, `firebase.json` (emulator) and `.firebaserc` (project `wickglow-a70f4`). Dev-only packages for the rules tests: `firebase-tools` and `@firebase/rules-unit-testing` (owner approved, 2026-11-13).
- [x] `@react-native-google-signin/google-signin` installed with `npx expo install` (owner approved, 2026-11-13).

## Build plan

One step at a time, each checked before the next. Status after the 2026-11-13 build:

1. **Email sign-in.** Built. An Account row in Stats (phone: the Stats view; tablet: after the calendar; desktop: the Progress card) opens a glass sign-in card: email, password (8+ characters, checked in the app), Sign in / Create account, Forgot password. Sign-up sends the verification email and the account works at once; the row shows "Email not confirmed" with Resend until the link is opened (re-checked when the app comes back to the front). Sign out keeps everything on the device. Code: `src/data/auth.ts`, `components/wickglow/features/account/`.
2. **Google sign-in.** Web built (popup, `google-sign-in.web.ts`). Android code built (`google-sign-in.ts`, `@react-native-google-signin/google-signin` 17.0.0) but not runnable until the owner tasks below are done: it needs a new development build, the Android app with its SHA-1 in Firebase, and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Until then the Google button is hidden on Android. The package's Expo config plugin is not in `app.json`: with no options it adds the `google-services` Gradle plugin, which fails without a `google-services.json`, and Android does not need it. iOS would need it with `iosUrlScheme`.
3. **Firestore layout and rules.** Built and tested; changed the same day to one collection for the read-cost fix (below). Everything is in `users/{uid}/records`, and the record id says what it is:
   - `s_{end}-{minutes}`: a finished focus session `{ kind: 's', end, minutes, task, at }`. Create-only, 1 to 180 minutes, `end` no later than now plus 5 minutes, the id must match the fields. `task` is the focused task's id or null.
   - `d_{calendarKey}`: the device's daily totals from before sync `{ kind: 'd', minutes, sessions, tasks, at }`. Create-only, at most 1440 minutes, 144 sessions, 500 tasks.
   - `t_{taskId}`: a task `{ kind: 't', text, done, doneOn, parentId, date, updatedAt, deleted: false, at }`, or its small tombstone `{ kind: 't', deleted: true, updatedAt, at }`. A tombstone cannot be edited back into a task. A task's open subtask list and its session count are not stored.
   - `reset`: `{ kind: 'r', epoch, at }`, the account's reset count, which can only go up.
   - `at` must be the server's time of the write. Everything else is denied, and every path checks `request.auth.uid`. Deleting is allowed, since it only lowers progress.

   No XP, level or streak is stored: `src/core/progress-log.ts` rebuilds them from the records. The rules limit what one write can add, not the total (a modified app could still write many sessions), which is fine while nothing compares XP between users. Rules: `firestore.rules`. Tests: `firestore-tests/rules.test.js`, 16 tests against the emulator, including two-user tests and the "only what's new" query (`npm run test:rules`). **Not deployed yet** (owner task).
4. **First sign-in.** Built. An empty account takes the device's progress; an empty device takes the account's; when both have progress, a card shows both (level, XP, minutes, tasks) and keeps only the one picked. Keeping the device deletes every record in the account and raises its reset count, so other devices read everything again once. "Decide later" leaves sync off until the user chooses from the Account row. A save from before this change turns its daily totals into day records once (`legacyFromHistory`), and those upload with the sessions.
5. **Ongoing sync.** Built. `components/wickglow/domain/account-sync.ts` listens only for records written since the device's last sync and reconciles each confirmed batch (`src/core/sync.ts`). Sessions and day records are kept once by id; tasks: the latest edit wins, a delete wins. A write that never reached the server is sent again, because only confirmed copies count as seen. Finished sessions go up 1.5 s later, task edits 10 s after the last one, and anything waiting goes up at once when the app leaves the foreground. Offline changes stay on the device and go up once the account answers again. The save in `storage.ts` stays the source the app reads from.
6. **Account deletion by email request.** Built. "Delete account" in the Account row opens an email draft to `encarnacionelher@gmail.com` with the account's email and id. `public/delete-account.html` is the web page, served at `https://wickglow.vercel.app/delete-account` once deployed; that link goes in the Play Console. Still to do: check this against Play's current account-deletion policy before release.
7. **Release prep.** Owner tasks below, then the Play release steps in progress.md.

Done when a second device shows the same XP, streak, tasks and history, and the rules tests pass. The rules tests pass. The two-device case passes in `account-sync.test.ts` (two fake devices on one in-memory account); it still needs checking on real devices against the live project.

## Read and write costs (fix B, owner 2026-11-13)

A review found that the first version read every record the user had ever saved each time the app opened: about 2,000 reads per open after a year of 4 sessions a day, so the free plan's 50,000 reads a day would cover only about 9 active users a day after a year. The owner chose fix B plus four savings, all built the same day:

- **B. Read only what's new.** Every record carries the server's write time (`at`). A device remembers the newest time it has read (`since`) and asks only for records at or after it. A full read happens only on first sign-in, on a new device, and after the account is reset from another device: keeping this device's progress deletes every record and raises the `reset` count, and other devices then read everything once.
- **1. Don't save what doesn't matter across devices.** Opening a task's subtask list no longer writes. A task's session count is no longer saved after each session; each session record names its task, and every device counts them (`withSessionCounts`). A count from before records existed stays on the device that has it.
- **2. Wait before sending task edits.** 10 seconds after the last edit, or at once when the app leaves the foreground, so a burst of edits is one write per task. Finished sessions still go up after 1.5 seconds.
- **3. One collection.** "Anything new?" is one query, and Firestore charges at least one read per query.
- **4. Clear deleted-task tombstones after 30 days.** Trade-off: a device left unopened for more than 30 days could bring back a task deleted elsewhere in that time.

Estimates for one active user (3 app opens, 4 sessions, about 6 task changes a day), against the free plan's 50,000 reads and 20,000 writes a day for all users:

| | First version | Fix B and 1 to 4 |
| --- | --- | --- |
| Writes per user per day | about 14 | about 9 |
| Reads per user per day, after 1 month | about 450 | about 16 to 20 |
| Reads per user per day, after 1 year | about 5,400 | about 16 to 20 |
| Active users a day the free plan covers, after 1 year | about 9 | about 2,000 to 2,500 |
| A new device after 1 year (once) | about 1,800 reads | about 1,500 reads |

The cost per user no longer grows with history; only setting up a new device does. If the limit is reached, Spark stops syncing until the daily reset (no charge) and the app keeps working on the device. Not built: one record per day of sessions (would make a new device after a year about 400 reads); add it if many users set up new devices.

## Checks run (2026-11-13)

After the read-cost fix (the first build's checks were the same kind, with fewer tests):

- `npx tsc --noEmit`: clean.
- `npm test`: 283 tests pass (6 more under the web preset). Covers `progress-log.test.ts` (rebuilding XP, streak and history; session counts per task), `sync.test.ts` (a delta and a full read, tombstones and their 30 days, the fields that are not synced, a reset), `account-sync.test.ts` (11 tests with an in-memory account shared by fake devices: two devices end with the same XP, streak, tasks and history; a burst of task edits is one write; opening a subtask list writes nothing; reopening the app with nothing new reads at most 1 record; the keep-which-progress choice and the other device following the reset; signing out; offline), and the save migration in `saved-state.test.ts`.
- `npm run test:rules`: 16 tests pass on the Firestore emulator.
- `npx eslint .`: no errors (the 14 warnings are in `components/music-tracks.ts`, from before).
- `npx expo export --platform web` and `--platform android`: both bundle. The exported page was loaded in headless Chrome and shows the timer.
- Not run: sign-in against the live project, and an Android device. These are listed in progress.md.

## Owner tasks

- [x] Firebase: turn on **Google** under Security, Authentication, Sign-in method.
- [x] Vercel: add the six `EXPO_PUBLIC_FIREBASE_*` variables under Project, Settings, Environment Variables.
- [ ] **Deploy the Firestore rules**: `npx firebase login`, then `npm run deploy:rules`. Until then the live database denies everything and the Account row shows "Could not reach your account" after sign-in.
- [ ] EAS: add the same six variables (`eas env:create`) so Android builds can reach Firebase.
- [ ] Google on Android: register an Android app in Firebase with package `com.cent.wickglow` and the SHA-1 from `eas credentials`; copy the **Web client ID** (Authentication, Sign-in method, Google, Web SDK configuration) into `.env` and EAS as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (Vercel does not need it: web uses the popup); then make a new development build. Email sign-in works on the current development build; only Google needs the new one.
- [ ] Privacy policy: add the account data stored in Firebase (email, account id, focus sessions, daily totals, tasks).

## Answered (owner, 2026-11-13)

- **Where sign-in lives:** an Account row in the Stats panel, always available. No prompt that interrupts a session. (Step 1)
- **Merge rule:** on first sign-in, if the device and the account both have progress, show both and let the user pick which to keep. (Step 4)
- **Google sign-in on Android:** yes. `@react-native-google-signin/google-signin` is approved; it needs a new dev build and an Android app in Firebase. (Step 2)
- **What syncs:** progress only (XP, streaks, tasks, history). Themes, timer lengths and sounds stay per device. (Step 3)
- **Sign-in UI:** tapping the Account row while signed out opens a small glass card over the app with email, password, Sign in / Create account and "Forgot password". The same on phone, tablet and desktop. (Step 1)
- **Email verification:** Firebase sends a verification link, but the account works right away. The Account row shows "Email not confirmed" until the link is clicked. (Step 1)
- **Sign out:** keeps XP, streak, tasks and history on the device, and the app carries on local-only. (Step 1)
- **Password:** at least 8 characters, checked in the app before sending. (Step 1)
- **Sync model:** each finished focus session is saved once as its own record (id, end time, minutes). XP, level, streak, quests and history are calculated from that list by `src/core`, never stored as editable totals. Combining devices keeps every session once, matched by id. Tasks: the latest edit to each task wins. Rules make sessions create-only, 1 to 180 minutes, with an end time not in the future. (Steps 3 and 5)
- **First sign-in merge kept as "user picks"** (re-confirmed after the sync model was chosen): if the device and the account both have progress, show both and keep only the one the user picks. (Step 4)
- **Progress from before sync:** the device's daily totals upload once, one record per past day (minutes, sessions, tasks), capped at 1,440 minutes a day by the rules. XP is recalculated from them, so it may differ slightly from the old stored total. (Step 4)
- **Task deleted on one device, edited on another:** the delete wins. (Step 5)
- **Reward checks:** capping how much XP and the streak can change in one write, in Firestore rules, is enough on the free plan. (Step 3)
- **Account deletion:** after a 7-day grace period, not instantly. Users request it by email to `encarnacionelher@gmail.com` and the owner deletes the account by hand. No in-app delete button. (Step 6)

## Open questions

None right now.

## Known issues

- `npm audit` reports 4 high findings in `@grpc/grpc-js`, which Firebase installs. It belongs to Firestore's Node build, which the app does not bundle. Re-check on the next Firebase update.
- `npx expo-doctor` fails one check because 13 Expo packages are behind on minor updates. This was already the case before Firebase.
- A device left unopened for more than 30 days could bring back a task deleted on another device in that time (tombstones are cleared after 30 days to keep reads low; owner accepted, 2026-11-13).
- A task edit reaches other devices about 10 seconds later, unless the app is closed or put in the background first.
- Once linked, XP is rebuilt from the records, so it can differ from the device's old stored total (owner accepted, 2026-11-13). One more difference: a quest claimed and then undone (a task unticked the same day) is unclaimed after a sync, where the device on its own keeps it.
