# Phase 1 — Project Foundation & Design System

**Before starting:** read `/CLAUDE.md` and `/.claude/PROGRESS.md` in full. This phase
sets the architecture every later phase depends on — get the structure right, not just
working code.

## Goal

Bootstrap the Next.js app, install and theme the design system, and put in place the
folder architecture, type definitions, mock data, and i18n scaffolding that every
later phase will build on top of. No real feature screens yet — this phase is the
skeleton and the design tokens, plus one throwaway "kitchen sink" style page to prove
the theme/fonts/colors are wired correctly.

## Prompt

Set up a new Next.js project in this repository (App Router, TypeScript, ESLint,
Tailwind CSS, `src/` directory, `@/*` import alias). Then:

1. **Fonts & theme**
   - Load Poppins (weights 500/600/700/800) for headings and Inter (weights
     400/500/600/700) for body text via `next/font/google`, applied globally.
   - Configure Tailwind theme colors from the brand tokens in `CLAUDE.md`: `ink`, `sub`,
     `bg`, `card`, `line`, `brand` (#2f6fed), `brand-2` (#0d9488), `accent` (#e08e00).
     Also add the six section accent colors used in plan.html (indigo/blue workspace,
     teal essentials, amber programs, red payments, slate console, purple platform) as
     named tokens (e.g. `section.workspace`, `section.essentials`, etc.) so later
     phases can theme sections consistently without picking colors ad hoc.
   - Set base border radius to match plan.html's `18px` card radius as a Tailwind
     `rounded-brand` (or similar) utility.

2. **Install and initialize shadcn/ui.** Set up its config to use the theme tokens
   above rather than shadcn's defaults. Install `lucide-react` for icons.

3. **Folder architecture** — create this structure with placeholder/barrel files where
   needed so the shape exists even before content:
   ```
   src/
     app/
       (auth)/          # language select, login, register — built Phase 3
       (app)/            # parent/student app — built Phases 4–7
       (console)/         # school console — built Phase 8
     components/
       ui/                # shadcn primitives live here
       shared/            # branded composite components — built Phase 2
     lib/
       data-source/        # data-access layer functions (see rule below)
       mock/                # mock fixtures, shaped like future Payload collections
       utils.ts
     types/                 # shared TS types, one file per domain entity
     i18n/                   # language dictionaries + provider/hook
     store/                   # mock auth/cart client state
   ```

4. **Domain types** in `src/types/` — write TypeScript types for at least: `School`,
   `ClassLevel` (e.g. Grade/Section), `UserProfile` (parent/student account),
   `Book`, `UniformItem`, `StationeryItem`, `Program`, `CartItem`, `Order`, `Receipt`.
   Model every type as if it already were a Payload collection: an `id: string`,
   explicit fields (no `any`), relationships expressed as the related entity's `id`
   (e.g. `Book.schoolId`, `Program.schoolId`), and `createdAt`/`updatedAt` timestamps.
   Add a short comment above each type noting it will become a Payload collection in
   Phase 9 — don't over-model fields that aren't needed yet.

5. **Data-access layer** in `src/lib/data-source/` — one file per entity (e.g.
   `books.ts`, `programs.ts`, `schools.ts`) exporting async functions such as
   `getSchoolBySlug(slug)`, `getBooksByClass(schoolId, classId)`,
   `getPrograms(filters?)`, `getProgramById(id)`. Implementations read from
   `src/lib/mock/*` fixtures for now (wrap the return in a resolved Promise; a small
   artificial delay, e.g. 150–300ms, is fine to simulate network latency for loading
   states later). Every later phase must call these functions — never import
   `src/lib/mock/*` directly from a component or page.

6. **Mock data** in `src/lib/mock/` for a single seed school, "Niraj Public School" —
   enough dummy content to make later phases feel real:
   - The school itself (name, slug, city, logo placeholder, contact info).
   - 3–4 class levels (e.g. Grade 3, Grade 6, Grade 9) each with a small book list
     (5–8 books with title, subject, price), a uniform/kit set (a few sized items with
     price), and a stationery starter kit (5–6 items with price).
   - 3–4 sample programs/events (e.g. Annual Sports Day, Science Exhibition, Summer
     Robotics Camp) with date, venue, fee, seats total/available, short description,
     and organizing school.
   - 1–2 sample user profiles for design/demo purposes only (not real auth yet).
   Use realistic Indian-school dummy text (INR pricing, CBSE-style subjects), not
   Lorem Ipsum, since the school stakeholders will be looking at this.

7. **i18n scaffolding** in `src/i18n/` — a provider + hook (e.g. `useTranslation()`)
   and dictionary files for `en`, `hi`, `te`. For this phase, only translate a handful
   of strings (app name, "Language", "Continue", "Welcome") end-to-end to prove the
   mechanism works — later phases add their own strings as they build screens. Persist
   the chosen language (e.g. `localStorage`) so it survives navigation.

8. **Proof-of-setup page** — a temporary route (e.g. `/dev/kitchen-sink`, clearly
   named so it's obvious it's not a real app screen) rendering: the brand color
   swatches, both fonts at a couple of sizes/weights, a few shadcn components (button,
   card, input, badge) themed correctly, and a live language switcher using the i18n
   hook that changes the handful of translated strings on the page. This page exists
   to visually confirm the foundation before building real screens on top of it —
   later phases may delete it.

## Out of scope for this phase

No auth, no real screens from the page list in plan.html, no Payload, no database. Do
not build the bottom navigation, home screen, or any store/program screens yet — that
starts in Phase 3/4.

## Definition of done

- `npm run dev` runs cleanly with no type errors.
- The kitchen-sink page shows the theme, fonts, a few shadcn components, and working
  language switching across en/hi/te.
- `src/types`, `src/lib/data-source`, `src/lib/mock`, `src/i18n` are populated per
  above and every mock read goes through the data-source layer.
- Update `.claude/PROGRESS.md`: mark Phase 1 done, note any structural deviations from
  this prompt and why.
