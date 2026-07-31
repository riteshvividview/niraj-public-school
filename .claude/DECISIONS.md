# Architecture Decisions Log

Log of decisions that shape how the phases are built. Append new entries as they're
made — don't rewrite history, add to it.

---

## 2026-07-31 — Initial stack decisions

**Repo shape: single Next.js + Payload repo, not separate frontend/backend repos.**
Why: the user wants to build UI first on mock data, then "add in the backend and
storage" on top of the same visual build once approved. Payload CMS 3 can install
directly into an existing Next.js app (App Router), sharing one deployment. Avoids
duplicating routing/auth/types across two repos, and keeps the phase-by-phase Claude
Code workflow simple (one repo, one `CLAUDE.md`).
How to apply: `src/app/(payload)` / `/admin` route added in Phase 9. Until then the repo
has no Payload dependency at all — it's a plain Next.js app on mock data.

**Styling: Tailwind CSS + shadcn/ui.**
Why: fast to theme to plan.html's brand tokens, accessible-by-default (Radix
primitives), and the component source lives in the repo so Claude Code can extend it
consistently across phases instead of fighting an opaque component library.

**Languages at launch: English, Hindi, Telugu.**
Why: user's choice, covers the pilot audience. i18n architecture (Phase 1) must still
be config-driven so a 4th/5th language is a translation-file addition, not a code change.

**Database (future): PostgreSQL via Supabase, connected through Payload's Postgres
adapter (`@payloadcms/db-postgres`).**
Why: user wants to start with Supabase and "later switch database." Because Payload's
DB adapters are swappable and Supabase *is* managed Postgres, pointing
`@payloadcms/db-postgres` at the Supabase connection string now means a future
database migration is a connection-string / adapter change, not a data-model rewrite.
How to apply: this only happens in Phase 9+. Phases 1–8 have zero database dependency —
everything runs on in-repo mock fixtures.

**Data-access-layer pattern for mock data.**
Why: user explicitly wants mock data now that "should be able to be modified using the
CMS" later, and wants the app "modular and scalable" without knowing future features.
Routing every read through `src/lib/data-source/*` functions (instead of components
importing fixtures directly) means Phase 9's CMS integration only touches the
implementation of those functions — UI code from Phases 1–8 should not need to change.

**"Real" login/registration pages, mock auth logic.**
Why: user asked for real login/registration pages "based on what we discussed in
plan.html" (OTP-based mobile login, no passwords, single profile per user, school
workspace assignment) even though there's no backend yet. Resolution: build the actual
production-intent UI/UX and validation now; back it with a mocked OTP flow (fixed/
visible demo code, mock session in client state) so the school can experience the real
flow. Swapped for real OTP delivery + server auth once the backend phase begins (not
part of Phases 1–10).

---

*(Add new entries below this line as decisions are made in later phases.)*
