# Build Phases — Niraj Public School Ordering Platform

This folder holds one Claude Code prompt per phase. Read `/CLAUDE.md` at the repo root
first — it has the full stack, brand tokens, and architecture rules every phase
depends on.

## How to use these

1. Run phases **in order** — each one assumes the previous phases' folder structure,
   types, data-source functions, and components already exist.
2. Generally start each phase in a **fresh Claude Code session**. Paste/reference the
   corresponding `phaseN.md` file as the prompt. The file itself tells Claude to read
   `CLAUDE.md` and `.claude/PROGRESS.md` first, so context carries over even in a new
   session.
3. Review the result visually before moving to the next phase — that's the whole point
   of building this on mock data first.
4. Git commits happen only when you explicitly say so (e.g. "commit everything") —
   phases don't commit on their own.
5. After each phase, `.claude/PROGRESS.md` gets updated with what was actually built,
   any deviations, and notes the next phase needs. Skim it before starting the next
   phase if it's been a while.

## Phase list

| Phase | File | What it builds |
|---|---|---|
| 1 | [phase1.md](phase1.md) | Next.js + Tailwind + shadcn/ui setup, brand theme, folder architecture, domain types, data-access layer, mock data, i18n scaffolding |
| 2 | [phase2.md](phase2.md) | Reusable branded UI components (header, nav, cards, receipt/QR, badges, skeletons) + a component gallery page |
| 3 | [phase3.md](phase3.md) | Language selector, OTP login, registration — real UI backed by mocked auth |
| 4 | [phase4.md](phase4.md) | Parent/student app shell: Home, Profile, Help & Support, bottom navigation |
| 5 | [phase5.md](phase5.md) | Essentials Store: Book List, Uniform & Kit, Stationery, shared cart state |
| 6 | [phase6.md](phase6.md) | Cart, checkout, simulated payment, digital receipt with QR, receipt history |
| 7 | [phase7.md](phase7.md) | Global Programs & Events feed, program details, enroll → pay → ticket |
| 8 | [phase8.md](phase8.md) | School Console: staff login, catalogue manager, program manager, QR scanner, reports |
| 9 | [phase9.md](phase9.md) | Real Payload CMS 3 integration (Postgres via Supabase), swapping mock data for real content — run only after the school approves the UI |
| 10 | [phase10.md](phase10.md) | Multilingual QA, responsiveness, accessibility, polish, and a demo handoff script |

## Where things are tracked

- `/CLAUDE.md` — stack, brand tokens, architecture rules (read by Claude Code
  automatically every session).
- `/.claude/DECISIONS.md` — why the stack/architecture choices were made.
- `/.claude/PROGRESS.md` — phase-by-phase status and session log.
- `/plan.html` — the original feature/scope brief shown to the school.
