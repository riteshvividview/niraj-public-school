# Phase 4 — App Shell: Home, Navigation, Profile, Help & Support

**Before starting:** read `/CLAUDE.md` and `/.claude/PROGRESS.md`, and confirm Phases
1–3 are done. This phase builds the parent/student app's skeleton that Phases 5–7 slot
their content into.

## Goal

Build the `(app)` route group's shell and the three "always there" screens from
plan.html's page list: Home, My Profile, and Help & Support — plus the persistent
navigation (`BottomNav` from Phase 2) connecting Home, Essentials, Programs, Receipts,
Profile.

## Prompt

1. **App layout** — `src/app/(app)/layout.tsx` wraps every page in this group with
   `AppHeader` (Phase 2) and `BottomNav` (Phase 2), and enforces the mock
   auth-protection from Phase 3 (redirect to `/login` if not authenticated).

2. **Home** (`/home`) — the user's assigned-school landing screen per plan.html: a
   welcome/greeting using the logged-in mock profile's name, a summary of the
   student's school + class, quick-entry cards into My School Essentials (Books /
   Uniform & Kit / Stationery — can link to Phase 5 routes even before they're fully
   built), a highlighted section for upcoming Programs & Events (pull 2–3 from the
   data-source layer), and a shortcut to Receipts if the user has any (mock this
   conditionally — some seed users have receipts, some don't, to test the empty state
   from Phase 2). Fetch everything through `src/lib/data-source`, nothing hardcoded.

3. **My Profile** (`/profile`) — single profile screen per plan.html (no family/
   multi-child switching): shows the mock profile's name, mobile number (masked
   appropriately), assigned school, class, the `LanguageSwitcher` from Phase 2, and a
   Logout action wired to the Phase 3 auth store.

4. **Help & Support** (`/help`) — multilingual FAQ list (accordion) covering payment
   and receipt/collection questions per plan.html (e.g. "How do I collect my books?",
   "What if I paid but didn't get a receipt?", "Can I change my class/school?"), plus a
   support contact block (phone/email/hours — mock but realistic). A "chat" affordance
   can be a visual entry point only (no working chat backend) — make that clear in the
   UI copy/design rather than implying a live chat that doesn't work.

5. **Navigation wiring** — confirm `BottomNav` correctly highlights the active tab
   across `/home`, the Essentials section root, the Programs section root, `/receipts`
   (stub route is fine if Phase 6 hasn't run yet — just don't 404), and `/profile`.

All copy through i18n in en/hi/te, consistent with Phase 3's pattern.

## Out of scope for this phase

No real catalogue/program/receipt detail screens — those are Phases 5–7. This phase
should produce working navigation and two fully real screens (Profile, Help) plus a
Home that assembles content built by later phases without breaking if that content
doesn't exist yet (use safe stub routes/placeholders where a later phase's route isn't
built yet).

## Definition of done

- Logging in lands on `/home`, which renders the greeting, quick-entry cards, upcoming
  programs, and (conditionally) a receipts shortcut — all sourced via
  `src/lib/data-source`.
- `BottomNav` navigates correctly and highlights the active section on every `(app)`
  route that exists so far.
- `/profile` and `/help` are fully built, real, and multilingual.
- Update `.claude/PROGRESS.md`: mark Phase 4 done, list the stub routes left for
  Phases 5–7 to fill in.
