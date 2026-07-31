# Phase 7 — Programs & Events

**Before starting:** read `/CLAUDE.md` and `/.claude/PROGRESS.md`, and confirm Phases
1–6 are done. Per plan.html, this is the one part of the platform that works **across
every school** — build it that way even though the mock data currently has only one
seed school (structure the filters/data model so a second school's programs would
appear in the same feed without code changes).

## Goal

Build the Global Programs Feed, Program Details, and the pay → enroll → ticket flow
from plan.html's "Programs & Events" feature group and page list.

## Prompt

1. **Global Programs Feed** (`/programs`) — lists all programs from
   `src/lib/data-source` (workshops, sports day, annual day, camps, extra classes per
   plan.html), using `ProgramCard` from Phase 2. Build real filter/sort controls: by
   school, category, date, and fee — even with only one seed school in the data, the
   filter UI and logic should be genuinely functional against whatever's in the mock
   data, not decorative. Include the `EmptyState` for "no programs match your filters."

2. **Program Details** (`/programs/[id]`) — date, venue, full description, fee, seat
   availability (visually distinguish Open / Filling Fast / Full using `StatusBadge`
   from Phase 2), and the organizing school's contact info, per plan.html. An
   "Enroll & Pay" action that adds the program to the shared cart store from Phase 5/6
   (a program enrollment is just another cart line item, priced by its fee, quantity
   fixed at 1 per user) and routes to checkout. If a program is Full, replace the
   enroll action with a clear "Full" state (a waitlist feature is a *future* addition
   per plan.html Page 03 — do not build waitlist logic now, just don't imply it works).

3. **Pay & Get Ticket** — reuse Phase 6's checkout/payment/receipt flow for program
   fees (no separate payment mechanism — plan.html is explicit that program fees flow
   through the same unified cart). The resulting `Receipt`/ticket should visually read
   as an event ticket when it's for a program (vs. a collection receipt for
   essentials) — extend `ReceiptCard` from Phase 2 with a program-specific variant
   (e.g. show venue/date prominently, label it "Ticket" rather than "Receipt") rather
   than building a second, separate component.

4. Wire Phase 4 Home's "upcoming programs" preview and `BottomNav`'s Programs tab to
   these real routes now.

All copy through i18n in en/hi/te, including category names, status labels
(Open/Filling Fast/Full), and filter labels.

## Out of scope for this phase

No waitlists, no ratings/feedback on programs, no cross-school analytics — all
"Suggested"/"Later phase" items per plan.html Page 03, not current scope. No school-
side program creation — that's Phase 8's Program Manager.

## Definition of done

- `/programs` lists and correctly filters/sorts the seed programs.
- A user can open a program, enroll, pay (via Phase 6's flow), and receive a
  ticket-styled receipt, findable afterward in My Receipts alongside essentials
  receipts.
- Full programs correctly block enrollment with a clear UI state.
- Update `.claude/PROGRESS.md`: mark Phase 7 done, note the ticket vs. receipt
  variant decision for Phase 8/9's reference.
