---
name: change-progression-rules
description: Use when changing how XP, levels, streaks or daily quests work, for example changing XP per minute, a level threshold, a quest goal or reward, or the streak rule.
---

# Change progression rules

These rules exist in three places that must always agree: the pure functions in `src/core`, the server function on Supabase, and the written spec. Change all three together.

1. Edit the rule in `src/core/xp.ts` (or the matching file in `src/core`). Keep functions pure and pass `now` in. Do not add React, Expo or Supabase imports.
2. Add or update unit tests next to it in `src/core/*.test.ts`. Cover midnight rollover, a skipped day, and the exact threshold values.
3. Update the matching Postgres function in `supabase/` with a new migration (`supabase migration new <short-name>`). Never edit a migration that was already applied. Ask first, because this changes the database schema or rules.
4. Update the numbers in `docs/agent/spec.md` under Progression.
5. If the change affects what users see (labels, level names), check the UI strings and `docs/agent/ui.md`.
6. Run `npx jest src/core`, `npx tsc --noEmit` and `npx expo export --platform web`.
7. Update `docs/agent/progress.md` with what changed and why.
