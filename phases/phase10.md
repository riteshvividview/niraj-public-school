# Phase 10 — Polish, Multilingual QA, Accessibility & Demo Handoff

**Before starting:** read `/CLAUDE.md` and `/.claude/PROGRESS.md`, and confirm Phases
1–9 (or 1–8, if presenting before the CMS integration — see note below) are done.

## Goal

Take the app from "feature complete" to "ready to show the school" — a focused QA and
polish pass across every screen built in Phases 3–8, plus a short handoff summary for
presenting the build.

## Note on sequencing

This phase can run either **after Phase 9** (fully backed by Payload/Supabase) or
**instead of Phase 9, before it** if the user wants to present the pure-UI/mock-data
version to the school first and only invest in the CMS integration after approval —
that was the original plan ("once they like the UI... then we remove the mock data").
Check `.claude/PROGRESS.md` for which the user has actually asked for before starting.
Either way, nothing in this phase's prompt changes — it's a QA pass over the same
screens regardless of what's powering their data.

## Prompt

1. **Multilingual QA** — go through every screen in `(auth)`, `(app)`, and `(console)`
   (console only if Phase 8 gave it full i18n coverage) in all three languages
   (en/hi/te). Check for: missing translation keys (falling back to English or raw
   keys), text overflow/wrapping issues from longer Hindi/Telugu strings breaking
   layouts, and correct number/currency/date formatting per locale.

2. **Responsiveness pass** — verify every parent/student screen at common mobile
   widths (e.g. 360px, 390px, 428px) and at least one tablet width, since plan.html
   is explicit this is primarily a phone experience for parents. Verify the console
   at tablet/desktop widths per Phase 8.

3. **Accessibility pass** — keyboard navigation through forms (login/register/
   checkout especially), sufficient color contrast against the brand palette, alt text/
   labels on icon-only buttons, and form error messages that are actually announced/
   associated with their fields, not just visually nearby.

4. **Empty, loading, and error states** — confirm every data-driven screen
   (essentials lists, programs feed, receipts, reports) has a real (not placeholder)
   loading skeleton, a real empty state, and a real error state (e.g. simulate a
   data-source failure and confirm the UI degrades gracefully rather than crashing).

5. **Visual consistency pass** — spacing, corner radius, shadow, and color usage
   consistent with the Phase 1/2 design tokens across every screen; no screen that
   looks like it was built to a different spec than the rest.

6. **Demo script / handoff doc** — write a short walkthrough doc (e.g.
   `.claude/DEMO-SCRIPT.md`) listing the order to click through the app for a school
   stakeholder demo (language → register → home → essentials → cart → pay → receipt →
   programs → enroll → ticket → profile → help, then switch to console → login →
   catalogue → programs → scan a receipt → reports), plus any known gaps/placeholders
   to mention proactively (e.g. "payment gateway is simulated for this demo").

## Out of scope for this phase

No new features. If QA surfaces a genuine scope gap (something plan.html describes
that no phase actually built), note it in `.claude/PROGRESS.md` rather than building
it ad hoc in this phase — flag it back to the user first.

## Definition of done

- A full click-through in all three languages, on mobile and desktop, with no broken
  layouts, missing translations, or unhandled empty/error states.
- `.claude/DEMO-SCRIPT.md` exists and matches the actual current build.
- Update `.claude/PROGRESS.md`: mark Phase 10 done, and record whether this ran
  before or after Phase 9's CMS integration, plus a final punch-list of anything
  intentionally deferred beyond these 10 phases.
