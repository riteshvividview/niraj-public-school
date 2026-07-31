# Phase 9 — Payload CMS Integration

**Before starting:** read `/CLAUDE.md` and `/.claude/PROGRESS.md`, and confirm Phases
1–8 are done and have been visually approved by the school (this phase is meaningfully
different in risk from the previous ones — it's the first time real infrastructure
enters the repo, so don't start it until the user confirms the UI is signed off).

## Goal

Replace the mock data layer with a real Payload CMS 3 instance, embedded in this same
Next.js app, so school staff can actually manage catalogues/programs/content through a
real admin UI — without changing any component or page code from Phases 1–8, because
they only ever talked to `src/lib/data-source/*`.

## Prompt

1. **Install Payload CMS 3 into this Next.js app** (not a separate project — see
   `.claude/DECISIONS.md` for why). Follow Payload's official Next.js integration
   pattern: `payload.config.ts` at the repo root, the Payload admin/API route handlers
   mounted under `src/app/(payload)`, and `/admin` serving the generated admin UI.

2. **Database**: configure `@payloadcms/db-postgres` using a `DATABASE_URI` environment
   variable pointing at a Supabase Postgres connection string (ask the user for the
   Supabase project's connection string / create a `.env.example` documenting the
   required variable — do not commit real credentials). Confirm the connection with
   Payload's dev server before building collections.

3. **Define collections** that are a direct translation of the `src/types/*` domain
   types from Phase 1 — do not redesign the data model here, translate it:
   - `Schools`
   - `ClassLevels` (or embed as a field group on relevant collections — use judgment,
     but keep it consistent with how Phase 1's types modeled the relationship)
   - `Books`, `UniformItems`, `StationeryItems` (each relating to `Schools` and a class
     level, per Phase 1)
   - `Programs` (relating to `Schools`)
   - `Users` (parent/student profiles — note Payload has its own auth-enabled
     collection pattern; decide whether the existing mock-auth model from Phase 3 maps
     onto a Payload auth collection now or stays mocked a while longer, and document
     that decision)
   - `Orders` / `Receipts`
   Set appropriate access control per collection (e.g. school staff only edit their
   own school's catalogue/programs — use Payload's access control functions, keyed off
   whatever auth/role model you land on in the point above).

4. **Seed script** — write a script that takes the exact mock fixtures from
   `src/lib/mock/*` (Phase 1) and creates matching Payload documents via the Local
   API, so the CMS starts populated with the same demo content the school has already
   seen and approved — nothing should visually change for them post-migration.

5. **Swap the data-access layer**: update each function in `src/lib/data-source/*` to
   read from Payload (Local API is preferable inside server components/route handlers
   for performance; REST/GraphQL where a client-side call is unavoidable) instead of
   the `src/lib/mock/*` fixtures. Function signatures should not need to change — this
   is the entire point of Phase 1's architecture rule. Once every function is swapped
   and verified, the `src/lib/mock/*` fixtures are no longer imported anywhere except
   possibly the seed script — leave them in place as the seed script's source, don't
   delete them.

6. **Verify nothing regressed**: walk through every screen built in Phases 3–8 against
   the real Payload-backed data and confirm it looks and behaves identically to the
   mock-data version, since that was the point of the architecture.

7. Console screens from Phase 8 (Catalogue Manager, Program Manager) that mock-wrote
   to in-memory data should now be reassessed per that phase's note: keep them only if
   they offer something Payload's generated `/admin` doesn't (e.g. a friendlier
   in-app editing experience for non-technical staff); otherwise redirect those console
   entry points to the relevant Payload admin collection view instead of maintaining
   two editing UIs.

## Out of scope for this phase

No payment gateway integration yet, no real OTP/SMS delivery yet (Phase 3's mock auth
can stay mocked, or be upgraded to a real auth collection — make and document a clear
decision either way, don't leave it ambiguous). No production deployment/hosting setup
unless the user asks for it as part of this phase.

## Definition of done

- `/admin` is a working Payload admin UI, populated with the seeded demo content.
- Every `src/lib/data-source/*` function reads from Payload, not `src/lib/mock/*`.
- All Phases 3–8 screens work unchanged against the real backend.
- `.env.example` documents required environment variables; no real secrets committed.
- Update `.claude/PROGRESS.md`: mark Phase 9 done, and update `.claude/DECISIONS.md`
  with the final collection schema and the auth-model decision from point 3.
