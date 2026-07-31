# Phase 3 — Language Selector, Login & Registration (Auth)

**Before starting:** read `/CLAUDE.md` and `/.claude/PROGRESS.md`, and confirm Phases
1–2 are done. This phase builds the real, production-intent auth screens — the first
thing any parent/student actually sees.

## Goal

Build the `(auth)` route group: the first-run language selector, mobile-number/OTP
login, and registration, matching plan.html's page list (Language Selector → Login/OTP
→ Home) and its "Accounts & School Workspace" feature group (password-free OTP login,
single profile per user, account tied to one assigned school). These must be **real,
finished UI/UX** — validation, error states, loading states, disabled states — backed
by a **mocked** auth mechanism (no real SMS, no real backend) since there is no server
yet.

## Prompt

Build the following screens in `src/app/(auth)/`, using the components from Phase 2
(`LanguageSwitcher`, plus shadcn form primitives) and the data-source layer from Phase 1
for reading the mock school:

1. **Language Selector** (`/` or `/language`, first-run screen) — full-screen, on-brand,
   lets the user pick English / Hindi / Telugu before anything else. Persist the choice
   (Phase 1's i18n mechanism) and route to Login. If a language is already set, this
   screen should be skippable (don't force it every visit — only first run or from a
   "change language" entry point).

2. **Login** (`/login`) — mobile number entry with basic validation (10-digit Indian
   mobile format), "Send OTP" action, then a 6-digit OTP entry step with resend/change-
   number affordances and a countdown timer for resend. Since there's no real SMS
   backend yet: after "Send OTP", show the mock OTP directly in the UI (e.g. a visibly
   labeled demo banner "Demo OTP: 123456" — make it obviously a placeholder for demo
   purposes, not something that could be mistaken for production behavior) so the flow
   is fully testable. On correct OTP entry, create a mock session (see state below) and
   route to Home.

3. **Registration** (`/register`) — for a first-time number: name, mobile number,
   **school workspace selection** (since accounts are tied to exactly one school —
   for now the mock data only has one seed school, but the picker should be built as a
   real search/select so it's obviously ready for more schools later), and student
   class/grade. Then the same OTP verification step as Login. On success, create the
   mock profile and route to Home. Decide and clearly implement how Login detects a
   new vs. existing number against the mock data (e.g. check `src/lib/mock` user
   records) and routes accordingly.

4. **Mock auth state** in `src/store/` (e.g. `useAuthStore` or an AuthContext) — holds
   the current mock session (selected profile, assigned school id, chosen language),
   persisted (e.g. `localStorage`) so a refresh doesn't log the user out during the
   demo. Expose `login()`, `logout()`, `isAuthenticated`. Route-protect the `(app)` and
   `(console)` groups against this mock state (redirect to `/login` if not
   authenticated) — this protection logic should be written generically enough to swap
   for real session checks later without restructuring routes.

5. **Validation & error states** — invalid mobile number, wrong OTP, OTP expiry/
   countdown, empty required fields on registration. These should behave and look
   finished, not placeholder.

All copy on these screens must go through the i18n layer, in all three languages
(en/hi/te) — this is the first real user-facing text in the app, get the translation
pattern right here since later phases repeat it.

## Out of scope for this phase

No real OTP delivery, no password reset (there are no passwords), no multi-child/
multi-profile switching (plan.html is explicit: single profile per user), no school
console login yet (that's Phase 8, and is a separate login surface).

## Definition of done

- A user can go language → register (new number) or language → login (existing mock
  number) → OTP → Home (Home can be a placeholder redirect target until Phase 4).
- Refreshing the browser mid-session keeps the user logged in; logging out returns to
  `/login` and blocks `(app)` routes until logging back in.
- All screens work and read correctly in all three languages.
- Update `.claude/PROGRESS.md`: mark Phase 3 done, note the exact mock-auth mechanism
  implemented (so Phase 8 and Phase 9 know what they're replacing/extending).
