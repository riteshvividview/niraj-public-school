# Phase 8 — School Console

**Before starting:** read `/CLAUDE.md` and `/.claude/PROGRESS.md`, and confirm Phases
1–7 are done. This is a **separate surface** from the parent/student app — different
login, different navigation, different visual tone (more utilitarian/operational),
per plan.html's "School Console" feature group and page list (items 15–19).

## Goal

Build the `(console)` route group: school staff login, Catalogue Manager, Program
Manager, Receipt/QR Verification (scanner), and Reports Dashboard — everything a
school needs to publish its listings and verify redemptions on the ground.

## Prompt

1. **School Login** (`/console/login`) — a separate, secure-looking login for school
   staff accounts (per plan.html, distinct from the parent OTP flow — this can be a
   more conventional staff login, e.g. email/username + password UI, still backed by
   mocked auth since there's no backend yet; use a separate mock auth store/namespace
   from Phase 3's parent auth so the two surfaces don't share session state). Add a
   `(console)` layout with its own nav (sidebar is appropriate here since school staff
   are more likely on a desktop/tablet than parents on a phone — this surface does not
   need to be mobile-first the way the parent app does, though it should still be
   usable on a tablet).

2. **Catalogue Manager** (`/console/catalogue`) — add/edit the fixed book, uniform, and
   stationery listings by class (per plan.html: update prices, sizes, availability).
   Build real forms (add item, edit item, remove item, per class) that operate against
   an **in-memory/mock write** to the Phase 1 mock data for this session (changes don't
   need to persist across a reload in this phase — that's what Phase 9's real CMS
   connection is for — but the UI/UX and validation should be complete and it should
   visibly update the list you're looking at). Note clearly in this screen's code/
   comments that in Phase 9 this becomes the Payload `/admin` collection UI, and this
   custom manager may be simplified or removed once Payload's generated admin covers
   it — don't over-invest in features Payload will give for free (e.g. don't build
   bulk CSV import here).

3. **Program Manager** (`/console/programs`) — create/edit/publish a program or event
   with date, venue, fee, and seat count, plus the ability to close registration once
   seats are filled (per plan.html). Same mock-write approach as Catalogue Manager.

4. **Receipt / QR Scanner** (`/console/scan`) — a UI for scanning a user's QR receipt
   at the counter or event gate (per plan.html). Since there's no real camera-to-QR
   pipeline required for this visual phase, build a realistic scanner UI (camera
   viewfinder framing, scan-line animation) that, for demo purposes, accepts a manually
   entered/selected receipt ID (e.g. picked from the mock receipts created in Phase 6)
   and shows a clear success/already-redeemed/invalid result state, marking the item
   collected or attendee checked-in in the mock data for this session.

5. **Reports Dashboard** (`/console/reports`) — payments received vs. items collected/
   attendees checked-in (per plan.html), using simple charts/summary stats over the
   mock `Order`/`Receipt` data. Include an "Export" UI affordance (per plan.html
   "Export summaries for accounting") — a working CSV/JSON export of the current mock
   data is enough; it doesn't need a backend job.

All copy can be English-primary for this console surface (school staff, not parents) —
confirm with the user if full en/hi/te coverage is wanted here too, but plan.html's
multilingual requirement is framed around the parent/student experience, so treat
console i18n as lower priority unless told otherwise.

## Out of scope for this phase

No Super Admin / cross-school platform panel — that's explicitly a "Later phase" item
per plan.html Page 03, not current scope. No real camera/QR-scanning library
integration required — the manual-entry demo scanner is sufficient for this visual
phase.

## Definition of done

- School staff can log in (mock) separately from the parent app and reach a distinct
  console shell.
- Catalogue Manager and Program Manager support add/edit/remove against the current
  session's mock data, visibly reflected in the parent app's `(app)` screens if you
  reload during the same session.
- The scanner demo correctly marks a selected mock receipt as redeemed and reflects
  that in Reports.
- Reports Dashboard shows real (mock) numbers, not static placeholder charts.
- Update `.claude/PROGRESS.md`: mark Phase 8 done, and flag explicitly which
  console features are expected to be replaced/simplified by Payload's generated
  admin UI in Phase 9.
