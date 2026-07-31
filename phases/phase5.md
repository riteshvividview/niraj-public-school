# Phase 5 — Essentials Store: Books, Uniform & Kit, Stationery

**Before starting:** read `/CLAUDE.md` and `/.claude/PROGRESS.md`, and confirm Phases
1–4 are done.

## Goal

Build the "My School Essentials" section from plan.html: the fixed, class-wise Books,
Uniform & Kit, and Stationery listings, and the shared "add to cart" mechanic that
Phase 6's checkout will consume. Remember plan.html's model: these are **fixed lists
per class**, not an open catalogue to browse and freely pick — a student sees exactly
what they're getting, and pays for the set (uniform/kit sizing is the one place with a
real choice, per plan.html's "size guide to help confirm the correct fit").

## Prompt

1. **Cart state** in `src/store/` (e.g. `useCartStore`) — holds selected essentials +
   (later, Phase 7) program enrollments, quantities/sizes where relevant, and derives
   a running total. This is shared infrastructure Phase 6 depends on — build it now so
   Phase 6 only has to build the checkout UI around it, not invent the state model.

2. **My School Essentials** (`/essentials`, section root) — overview screen linking
   into the three sub-sections below, each showing a completion indicator (e.g. "Books
   — Selected", "Uniform — Size not confirmed yet") so a parent can see at a glance
   what still needs attention before checkout.

3. **Book List** (`/essentials/books`) — the fixed class-wise book list for the logged-
   in mock profile's class, fetched via `src/lib/data-source`. Show subject, title,
   price, and a running subtotal. Since plan.html frames this as a fixed set students
   receive (not picked item by item), default everything as included/selected, but
   still allow removing an item to a "not needed" state (some parents may already own
   a book) — reflect that choice in the cart total.

4. **Uniform & Kit Store** (`/essentials/uniform`) — listed items by size, with a size
   guide/reference (a simple size chart component is fine — real measurements aren't
   critical for this visual phase, but it should look like real content, not a
   placeholder). Let the user confirm a size per item before it's added to cart at the
   confirmed size/price.

5. **Stationery & Essentials** (`/essentials/stationery`) — the fixed starter-kit set
   for the class, same pattern as Book List (listed, priced, defaulted-in, removable).

6. Use `ItemCard`, `EmptyState`, and `LoadingSkeletons` from Phase 2 throughout. Add a
   persistent "Review & Pay" affordance (e.g. a sticky bottom bar showing item count +
   running total) visible across all three sub-sections, linking toward the Phase 6
   cart/checkout route.

All copy through i18n in en/hi/te.

## Out of scope for this phase

No actual checkout/payment flow — that's Phase 6. No program/event content — that's
Phase 7. Don't build a generic multi-school catalogue browser; this is explicitly the
one assigned school's fixed listings.

## Definition of done

- All three essentials sub-sections render real mock data via the data-source layer,
  reflect selections/sizes/removals in the shared cart store, and show a correct
  running total.
- The section-root completion indicators accurately reflect cart state.
- Sticky "Review & Pay" bar is present and links toward checkout (stub route acceptable
  if Phase 6 hasn't run yet).
- Update `.claude/PROGRESS.md`: mark Phase 5 done, document the cart store's shape
  since Phase 6/7 build directly on it.
