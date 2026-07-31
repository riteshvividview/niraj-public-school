# Phase 2 — Core UI Component Library

**Before starting:** read `/CLAUDE.md` and `/.claude/PROGRESS.md`, and confirm Phase 1
is marked done. This phase builds the branded, reusable components every screen from
Phase 3 onward will use — get these right once instead of re-solving the same UI
pattern in every phase.

## Goal

A small, consistent library of composite components in `src/components/shared/`
(built on top of the shadcn primitives from Phase 1), styled to match plan.html's
visual language (soft cards, rounded-brand corners, subtle shadows, the brand
color system), and a `/dev/kitchen-sink` (or similar) gallery page showing every one
of them in its states, so they can be visually approved before being used in real
screens.

## Prompt

Using the shadcn/ui primitives and theme tokens set up in Phase 1, build the following
shared components in `src/components/shared/`. Each should accept sensible props (not
be hardcoded to one piece of copy), support the i18n hook where they render text, and
work at mobile widths first.

1. **AppHeader** — top bar for the parent/student app: back button (optional), page
   title, and optional right-side action (e.g. profile icon, help icon).
2. **BottomNav** — mobile bottom tab bar for the parent/student app with icons for
   Home, Essentials, Programs, Receipts, Profile (final route names finalized in
   Phase 4 — build this generically, taking a list of tabs as props).
3. **LanguageSwitcher** — a compact trigger (e.g. globe icon + current language) that
   opens a selector (sheet/dropdown) listing en/hi/te, calling the i18n hook from
   Phase 1. This will be reused both as the full-screen first-run selector (Phase 3)
   and as a small in-app control (e.g. in Profile).
4. **SectionCard** — the general "card with icon, title, list of bullet lines" pattern
   used throughout plan.html's feature grid — reusable for feature summaries, program
   summaries, catalogue item summaries, etc. Accepts an icon, title, description/list,
   and an accent color keyed to the `section.*` tokens from Phase 1.
5. **ItemCard** — a catalogue item summary (used for books/uniform/stationery in
   Phase 5): image/placeholder, name, short meta line, price, and a quantity or
   add-to-cart affordance (can be a simple checkbox/toggle since class lists are fixed,
   not freely chosen — confirm against plan.html's "fixed list, not à la carte" model).
6. **ProgramCard** — event/program summary card (used in Phase 7): title, school
   name, date, venue, fee, seats-remaining indicator, and a status badge (Open /
   Filling Fast / Full).
7. **PriceSummary** — a cart/checkout line-item + total breakdown block (used in
   Phase 6).
8. **ReceiptCard** — a digital receipt visual: school name, item/program summary,
   amount paid, date, a QR code placeholder (use a real QR-generating library against
   a dummy string, e.g. the receipt ID, so it looks authentic — no backend needed to
   generate a scannable-looking code), and a status chip (e.g. "Paid — Ready to
   Collect" / "Checked In"). Used in Phase 6 and Phase 7's ticket screen.
9. **EmptyState** — icon, message, optional action button — for empty cart, no
   programs matching filters, no receipts yet, etc.
10. **StatusBadge** — small pill component for statuses used across the app (Open /
    Full / Paid / Pending / Checked-in / Cancelled), color-mapped consistently.
11. **LoadingSkeletons** — skeleton/loading placeholders matching the shapes of
    ItemCard, ProgramCard, and ReceiptCard, for use while data-source calls resolve.

Also add a **`/dev/component-gallery`** route (or extend the Phase 1 kitchen-sink page)
that renders each component above with 2–3 example states (e.g. ProgramCard in Open /
Filling Fast / Full), so they can all be reviewed on one screen without navigating the
real app.

## Out of scope for this phase

No real pages/routes beyond the gallery page. No data-source wiring yet beyond feeding
the gallery with a few mock records for realistic previews — real screens are built in
Phases 3–8 using these components.

## Definition of done

- Every component above exists in `src/components/shared/`, is typed (no `any` props),
  responsive, and pulls text through the i18n hook where applicable.
- The gallery page renders all components with multiple states and looks visually
  consistent with plan.html's card/spacing/color language.
- Update `.claude/PROGRESS.md`: mark Phase 2 done, note any components added/renamed
  vs. this prompt and why (e.g. if a pattern needed splitting into two components).
