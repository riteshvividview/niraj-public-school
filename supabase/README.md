# Supabase — schema & migrations

This project's Postgres schema lives on a real Supabase project and is managed
through the **Supabase CLI**, tracked as migrations in `supabase/migrations/`.
Payload's Postgres adapter has schema auto-push disabled (`push: false` in
`payload.config.ts`) — the app never alters the database on its own; schema changes
only happen when a migration is pushed deliberately.

## One-time setup (already done for this project)

- `supabase/config.toml` — created via `supabase init`.
- Linked to the real project: `binfukzemlwegjswdhvk` (see `NEXT_PUBLIC_SUPABASE_URL`
  in `.env`).
- `supabase/migrations/20260731132628_init.sql` — the initial schema (every
  collection as of Phase 9). The tables already existed on the Supabase project
  (applied by hand, before this repo switched to the CLI workflow), so this migration
  was registered against the already-correct database via `supabase migration repair`
  rather than `db push` — `npm run supabase:status` confirms local and remote agree,
  and `supabase db push --dry-run` reports "Remote database is up to date."

## Requirements in `.env`

- `SUPABASE_ACCESS_TOKEN` — a personal access token (supabase.com → Account → Access
  Tokens), lets the CLI authenticate without an interactive `supabase login` browser
  flow.
- `SUPABASE_DB_PASSWORD` — the project's Postgres password, **not** percent-encoded
  (unlike the copy embedded in `DATABASE_URI`, which must be).

Both are read automatically by the `npm run supabase:*` scripts below (via
`dotenv-cli`). Never commit `.env` — it's gitignored.

## Day-to-day commands

```
npm run supabase:status          # compare local migrations/ vs what's applied remotely
npm run supabase:migration:new <name>   # create an empty supabase/migrations/<ts>_<name>.sql
npm run supabase:push            # apply any new migrations to the real Supabase project
```

## Changing the schema (e.g. adding/editing a Payload collection field)

Payload's own `payload migrate:create` CLI currently crashes on this project's
Node/tsx setup (see `.claude/DECISIONS.md`) — use the dev-only workaround route
instead, then turn its output into a proper Supabase migration:

1. Edit the collection(s) in `src/collections/*.ts`.
2. With the dev server running (`npm run dev`), regenerate Payload's own migration
   snapshot (no database connection needed for this step):
   ```
   curl -X POST "http://localhost:3000/api/generate-migration?name=<short-description>"
   ```
   This adds a new `src/migrations/<timestamp>_<short-description>.ts` (+ `.json`
   snapshot) — Payload's migration-history bookkeeping, keep it committed.
3. Create the matching Supabase migration and copy the SQL over:
   ```
   npm run supabase:migration:new <short-description>
   ```
   Open the new empty `supabase/migrations/<ts>_<short-description>.sql` and paste in
   the SQL from the new `src/migrations/<timestamp>_init.ts` file's `up()` function's
   template literal (just the SQL text between the backticks).
4. Review the SQL, then apply it:
   ```
   npm run supabase:push
   ```

## Restoring a local/disposable database instead

If you ever need to test against a throwaway Postgres again instead of the real
Supabase project, `supabase/migrations/*.sql` is plain SQL — run every file in order
against any empty Postgres database and it reconstructs the same schema.
