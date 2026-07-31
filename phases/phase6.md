# Phase 6 — Cart, Checkout, Mock Payment & Digital Receipts

**Before starting:** read `/CLAUDE.md` and `/.claude/PROGRESS.md`, and confirm Phases
1–5 are done. This phase builds the mechanic plan.html calls the core of the whole
platform: pay online, get a receipt, redeem in person.

## Goal

Build the unified cart/checkout, a simulated payment step, the receipt/QR generation
screen, and the receipt history list — all from plan.html's "Payments & Receipts"
feature group and page list (Cart & Checkout → Payment Confirmation/Receipt → My
Receipts).

## Prompt

1. **Cart & Checkout** (`/cart`) — reads the `useCartStore` from Phase 5 (essentials
   selections) and, once Phase 7 exists, program enrollments too (build this screen to
   read from a combined cart total regardless of source — don't special-case books vs.
   programs in the UI beyond a clear section label for each). Use `PriceSummary` from
   Phase 2. Show a clear breakdown by category (Books / Uniform & Kit / Stationery /
   Programs), an editable state (remove an item, jump back to adjust a size), and the
   grand total. Per plan.html, note clearly in the UI that there is **no admission fee
   or delivery charge** — parents are paying only for the listed items/programs.

2. **Payment step** — a payment method selection screen (UPI / Card / Net Banking,
   visually real per plan.html's supported methods) that, on "Pay Now", **simulates**
   a brief processing state (e.g. a 1–2 second loading state) and then succeeds. Build
   this as an isolated, clearly-named mock (e.g. a `simulatePayment()` function in the
   data-source or a dedicated `src/lib/mock-payment.ts`) so Phase 9+ (out of scope
   here) can swap in a real gateway without touching the surrounding UI. Include a
   (rare, e.g. toggleable via a dev-only control) failure state UI so the "payment
   failed, try again" path is designed too, not just the happy path.

3. **Payment Confirmation / Receipt** (`/receipts/[id]` or `/checkout/success`) — on
   successful mock payment, generate an `Order` + `Receipt` (per the Phase 1 types),
   store it in the mock session/cart-store's history, clear the cart, and show the
   `ReceiptCard` from Phase 2 with a real-looking QR code (encode the receipt id/a
   dummy payload — it doesn't need to resolve to anything real, but should visually
   function as a QR code). Include the "downloadable and shareable as PDF or image"
   affordance from plan.html — a working "Download" / "Share" UI action is enough
   (e.g. export the receipt card as an image client-side); it doesn't need a backend.

4. **My Receipts** (`/receipts`) — history list of all receipts generated in the mock
   session, organized by date, using `EmptyState` from Phase 2 when there are none.
   Tapping one reopens the same receipt view from step 3. Seed 1–2 mock historical
   receipts for the demo profile(s) from Phase 3 so this screen isn't empty on first
   login even before a user completes a real checkout in the demo.

5. Wire the Phase 4 Home screen's "Receipts shortcut" and Phase 5's "Review & Pay" bar
   to these real routes now.

All copy through i18n in en/hi/te, including payment method labels and receipt status
text.

## Out of scope for this phase

No real payment gateway integration (Razorpay/Stripe come later, outside Phases
1–10 — see `CLAUDE.md`). No refund flow (that's a "Suggested" future addition per
plan.html Page 03, not current scope).

## Definition of done

- A user can go from Essentials selections → Cart → pay (simulated) → see a real
  receipt with a QR code → find it again in My Receipts.
- Removing/adjusting items in Cart correctly updates totals before payment.
- The mock payment function is isolated enough that swapping in a real gateway later
  is a contained change (documented in `.claude/PROGRESS.md`).
- Update `.claude/PROGRESS.md`: mark Phase 6 done, note the exact shape of `Order`/
  `Receipt` mock records generated, since Phase 9 will mirror this as CMS collections.
