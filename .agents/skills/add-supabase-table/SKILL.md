---
name: add-supabase-table
description: Use when adding or changing a Supabase table, column, RLS policy or database function for LumiFi.
---

# Add a Supabase table

Ask the user before running this. It changes the database schema and access rules.

1. Create a migration: `supabase migration new <short-name>`. Do not edit a migration that was already applied.
2. In the migration, create the table with a `user_id uuid not null references auth.users(id)` column and `created_at timestamptz not null default now()`.
3. In the same migration, run `alter table <name> enable row level security;` and add policies so a user can select, insert, update and delete only rows where `user_id = auth.uid()`. A table without RLS is a bug.
4. If the table holds anything that earns rewards (XP, level, streak, quest claims, pet drops), do not let the client write those columns. Write them only through a Postgres function that validates the input.
5. Apply it locally (`supabase db reset`) and test with a second user to confirm they cannot read the first user's rows.
6. Regenerate types: `supabase gen types typescript --local > src/data/database.types.ts`. Do not hand edit that file.
7. Add the query in `src/data` only. Components and stores call it. Check `error` before using `data`.
8. Update the storage model in `docs/agent/architecture.md`, then run `npx tsc --noEmit` and update `docs/agent/progress.md`.
