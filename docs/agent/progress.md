# Progress

Read at the start of every session. Update after each meaningful change. Keep it short: what is current, what is open, and what still needs checking. Finished work goes in [completed.md](completed.md).

## Current phase

v2

## Current feature

Google Play release

## Current goal

Ship Wickglow on Google Play. 

## Not yet completed

- Google Play release (current). See Google Play deployment.
- C1 from [../issues.md](../issues.md): the uncleared videos.

## Open questions

None right now.

## Google Play deployment

Work for the owner, in order:

1. **Privacy policy URL.** Deployed at `https://wickglow.vercel.app/privacy`. Paste it into the Play Console privacy policy field.
2. **Account deletion page.** Check that `https://wickglow.vercel.app/delete-account` loads. Play requires a web link for account deletion requests.
3. **Store listing.** App name: Wickglow. Icon: done. Still to add: short description, full description, feature graphic (1024×500), and at least two phone screenshots.
4. **Data Safety form.** Declare what the app collects: sign-in email and name (optional), and saved progress for accounts; nothing else. Check the answers against the privacy policy before submitting.
5. **Content rating questionnaire.**
6. **Target audience.** 13+ age groups only, and "No" to appealing to children.
7. **Permissions declaration.** The app declares `SCHEDULE_EXACT_ALARM` and `USE_EXACT_ALARM` (session-end alarm) and a media playback foreground service. Google may ask why the exact-alarm permissions are needed. Check the declaration before submitting.
8. **Background licences** (`BACKGROUND_LICENSES.md`). Kept as they are for now. Still open: the permission text for `frog_lily_pond` (Abi Toads), Wallper's reply for `cyberpunk_desk`, Wallper's coverage of `snowy_sled`, `mossy_branch` and `night_hills` (add their page links), and the row for `270983_medium.mp4` (Classic, Pixabay) if still missing.
9. **Release build.** The APK for testing is installed. For Play, build an `.aab` with `eas build --platform android` (production profile). Test that build on a device, because a debug build does not show R8 problems.
10. **Closed test.** 12 testers opted in for 14 consecutive days (personal accounts created after 13 November 2023). Start it as soon as the release build is ready.
11. **Production access.** Apply after the closed test has run 14 days.
12. **Submit.** Run `eas submit` to production.
13. **Create the Play Console developer account** ($25 one time, identity verification can take a few days). Steps 3 to 12 happen in that account, so it has to exist first in practice, even though it is listed last.

APK builds until then: `eas build --platform android --profile preview` (sideloadable APK, same EAS keystore Play will use, so do not delete it). EAS pins Node 24.12.0. If your npm config has `legacy-peer-deps=true`, remove it (`npm config delete legacy-peer-deps`) or `npm ci` on EAS fails. EAS project: `@cent_1214/wickglow`. The 13 Expo patch updates (2026-11-14) changed native modules, so the next APK needs a fresh EAS build.

## Next up

None right now.

## Still to check

- Tablet side column spacing (2026-11-15): sections with dividers. Look at it on a tablet or a 600-840 web window.

## Tooling notes

- Docs (2026-11-15): added `docs/user-guide.md` (for users) and `docs/developer-guide.md` (for contributors; links to the agent docs instead of copying them), linked from `README.md`. Keep both in step when a user-visible feature or the code layout changes.

- `npm audit` reports 0 vulnerabilities through the `overrides` in `package.json` (`@grpc/grpc-js`, `uuid`, `re2`, `@opentelemetry/core`, `glob`), all transitive copies in dev-only `firebase-tools`; the app bundle is unaffected. Do not run `npm audit fix --force`: it downgrades `firebase`/`firebase-tools` to older majors. Re-check the overrides when `firebase-tools` resolves them itself.
- Agent skills (2026-11-15): removed `add-supabase-table` and `change-progression-rules` (both written for the old Supabase backend). Installed `grilling`, `codebase-design` and `domain-modeling` from `mattpocock/skills` with `npx skills add`, because `grill-me` and `improve-codebase-architecture` call them. They are pinned in `skills-lock.json` and linked into `.claude/skills/` for Claude Code.
