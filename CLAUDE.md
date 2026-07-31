# Niraj Public School — Ordering Platform

This file is read automatically by Claude Code at the start of every session in this
repo. Read it fully before touching any code. It is the single source of truth for
stack, architecture rules, and how the phased build works.

## What this project is

A parent/student-facing ordering platform for Niraj Public School (built by VividView),
plus a school-side console. Full scope and rationale live in [`plan.html`](plan.html) —
treat it as the product brief. Summary:

- Each school gets its own dedicated workspace (a parent/student account is tied to
  exactly one school — no cross-school browsing).
- **Essentials Store**: fixed, class-wise lists of Books, Uniform & Kit, and Stationery
  published by the school. Nothing is à la carte — a student sees exactly what they get.
- **Programs & Events**: the one cross-school part of the platform — any school posts a
  program (workshop, sports day, camp, etc.), any user can find and pay for it.
- **Payments & Receipts**: pay online (UPI/cards/net banking) → get a digital receipt
  with a QR code → show it at school to collect items or check in to a program. Nothing
  is delivered; everything is collected/attended in person.
- **School Console**: lets school staff manage the catalogue, manage programs, scan
  receipt QR codes at the counter/gate, and see payment vs. redemption reports.
- App must be very easy for non-technical parents: OTP login (no passwords), a
  language selector, and a simple, guided flow.

## Current stage of the build

We are in the **UI / visuals phase**. The goal right now is a fully clickable,
good-looking, realistic frontend running entirely on **mock data**, so the school can
approve the look and flow before any real backend, payments, or database work begins.

Do **not**, until explicitly told to in a later phase:
- Wire up a real payment gateway (Razorpay/Stripe) — checkout success is simulated.
- Send real OTPs — OTP is mocked (e.g. a fixed code, shown on screen for demo purposes).
- Connect a real database — mock data lives in code as typed fixtures.
- Build the Super Admin / cross-school platform panel — that's a later-phase item from
  plan.html's "What Else Could Be Added" (Page 03), not current scope.

All mock data must be shaped **exactly** like the Payload CMS collections it will
eventually come from (see "Data layer rules" below), so swapping mock → real is a
matter of changing the data-source implementation, not the UI or types.

## Tech stack (decided 2026-07-31 — see `.claude/DECISIONS.md` for rationale)

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| Repo shape | **Single repo** — Payload CMS installs into this same Next.js app later (admin at `/admin`), not a separate backend project |
| Styling | Tailwind CSS |
| Components | shadcn/ui (Radix-based), themed to the brand tokens below |
| Icons | lucide-react |
| Fonts | Poppins (headings), Inter (body) — via `next/font/google` |
| State (mock phase) | React Context / Zustand for mock auth session + cart — client-side only for now |
| i18n | English, Hindi, Telugu at launch; architecture supports adding more languages via config only |
| CMS (added Phase 9) | Payload CMS 3, embedded in this Next.js app |
| Database (added Phase 9+) | PostgreSQL via Supabase connection string, using `@payloadcms/db-postgres` — swappable later since Payload's DB adapters are interchangeable |
| Payments (future, not this build) | Razorpay or Stripe (India-ready) |
| Hosting (future, not this build) | Vercel |

## Brand tokens (from `plan.html`)

```css
--ink:#1a2130;   --sub:#5c6472;   --bg:#eef1f6;   --card:#ffffff;  --line:#e4e8f0;
--brand:#2f6fed; --brand-2:#0d9488; --accent:#e08e00;
--radius:18px;
--font-head:'Poppins'; --font-body:'Inter';
```
Use these as the Tailwind theme's base palette (`brand`, `brand-2`, `accent`, `ink`,
`sub`, `bg`, `card`, `line`) — don't invent a different palette. Group-specific accent
colors used in plan.html's cards (workspace=indigo/blue, essentials=teal, programs=amber,
payments=red, console=slate, platform=purple) may be reused for section theming.

## Implementation reality (set in Phase 1 — read before touching theme/build config)

- **Tailwind v4, CSS-first config.** There is no `tailwind.config.ts`. All theme
  tokens (brand colors, fonts, radius, shadcn's semantic tokens) live in
  `src/app/globals.css` under `@theme inline` and `:root`. Add new design tokens
  there, not in a JS config file.
- **shadcn/ui is on its new major CLI** (`shadcn@4.x`). `components.json` uses
  `"style": "radix-nova"`. Icon library is already `lucide` — don't reinstall
  `lucide-react` separately. Use `npx shadcn@latest add <component>` to add more
  primitives; it will not prompt interactively if the project is already initialized.
- **Next.js 16**, App Router, Turbopack dev server by default, React 19. If something
  in your training data about Next.js APIs seems off, check `AGENTS.md` at the repo
  root and `node_modules/next/dist/docs/` before assuming — this version has changes.
- Fonts are wired in `src/app/layout.tsx` via `next/font/google`: Inter as
  `--font-inter` (body, Tailwind `font-sans`), Poppins as `--font-poppins`
  (headings, Tailwind `font-heading`, applied to `h1`–`h6` globally).
- plan.html's amber `--accent` token is implemented as `--warm` / `text-warm` /
  `bg-warm` in code — renamed to avoid colliding with shadcn's own semantic `--accent`
  (menu/hover surface color, a different concept).
- Persisting client-only state read from `localStorage` (e.g. language preference)
  should use `useSyncExternalStore`, not `useEffect` + `setState` — the project's
  ESLint config (`react-hooks/set-state-in-effect`) rejects the latter pattern. See
  `src/i18n/context.tsx` for the reference implementation.
- Full detail on what Phase 1 actually built (vs. this file's general description) is
  in `.claude/PROGRESS.md`'s Phase 1 session-log entry — check it before Phase 2.

## Architecture rules

1. **Data-access layer, always.** Components and pages never import mock fixtures
   directly. They call functions from `src/lib/data-source/*` (e.g. `getBooksByClass()`,
   `getProgramById()`, `getSchoolBySlug()`). Right now those functions read from
   `src/lib/mock/*` fixtures and return promises (simulate latency where useful). In
   Phase 9 only the *implementation* of these functions changes to call Payload's Local
   API/REST — call sites and component code should not need to change.
2. **Types mirror future CMS collections.** Every type in `src/types/*` should be
   written as if it were already a Payload collection's shape (id, relationships by id,
   timestamps) so the eventual collection config is a straight translation of the type.
3. **Route groups** separate the three surfaces:
   - `src/app/(auth)` — language select, login, register
   - `src/app/(app)` — the parent/student app (home, essentials, programs, cart, receipts, profile, help)
   - `src/app/(console)` — the school console (separate login + admin-style screens)
4. **Modular & scalable, not speculative.** Build exactly what the current phase asks
   for, structured so a new feature is a new folder/collection, not a rewrite. Don't
   pre-build features from future phases.
5. **Mobile-first.** Parents will mostly use this on phones. Design and test at mobile
   widths first, then scale up.
6. **Multilingual from the start.** Every user-facing string goes through the i18n
   layer (`src/i18n`) — no hardcoded English strings in components, even during the
   mock phase.

## How the phased build works

- `phases/phase1.md` through `phases/phase10.md` are self-contained prompts, meant to
  be fed to Claude Code one at a time, in order, generally in a fresh session per phase.
- Each phase file assumes you (Claude) will **read this `CLAUDE.md` and
  `.claude/PROGRESS.md` first**, then execute that phase's prompt in full.
- At the end of a phase, update `.claude/PROGRESS.md`: mark the phase done, note what
  was actually built vs. deferred, and log any decisions that future phases should know
  about.
- The user drives everything remotely and reviews visually between phases. Don't ask to
  proceed to the next phase yourself — stop at the end of the current phase's Definition
  of Done and summarize what's ready to look at.
- **Git**: the user will explicitly say "commit everything" (or similar) when they want
  a commit made. Do not commit proactively mid-phase unless asked.

## Reference documents

- [`plan.html`](plan.html) — the full feature/page/timeline brief shown to the school.
- `Feature-Presentation-VividView-3rd-July.pptx` — earlier slide version of the same brief.
- `.claude/DECISIONS.md` — architecture decisions log, with rationale.
- `.claude/PROGRESS.md` — phase-by-phase build status.
