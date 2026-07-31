# Build Progress

Last updated: 2026-07-31

Status legend: `Not started` · `In progress` · `Done` · `Blocked`

| # | Phase | Status | Notes |
|---|---|---|---|
| 1 | Project Foundation & Design System | Done | Next.js 16 (App Router, Turbopack) + Tailwind v4 + shadcn/ui (radix-nova) on brand theme; see notes below |
| 2 | Core UI Component Library | Done | 11 shared components + /dev/component-gallery; i18n dictionary expanded (nav/status/common); see notes below |
| 3 | Language Selector, Login & Registration (Auth) | Not started | |
| 4 | App Shell — Home, Navigation, Profile, Help & Support | Not started | |
| 5 | Essentials Store — Books, Uniform & Kit, Stationery | Not started | |
| 6 | Cart, Checkout, Mock Payment & Digital Receipts | Not started | |
| 7 | Programs & Events | Not started | |
| 8 | School Console (admin side) | Not started | |
| 9 | Payload CMS Integration (mock → real content layer) | Not started | |
| 10 | Polish, Multilingual QA, Accessibility & Demo Handoff | Not started | |

## How to update this file

At the end of each phase, Claude Code should:
1. Flip that row's status.
2. Add a one-line note on anything deferred, changed from the phase prompt, or that
   the next phase needs to know.
3. Update "Last updated" above.

## Session log

_(Newest entries at the top. One entry per phase completed, a few lines each.)_

- **2026-07-31** — **Phase 2 done.** All 11 components built in `src/components/shared/`:
  `AppHeader`, `BottomNav`, `LanguageSwitcher` (+ exported `LanguageOptionList` for
  Phase 3's full-screen reuse), `SectionCard`, `ItemCard`, `ProgramCard`,
  `PriceSummary`, `ReceiptCard`, `EmptyState`, `StatusBadge`, and
  `ItemCardSkeleton`/`ProgramCardSkeleton`/`ReceiptCardSkeleton` in
  `loading-skeletons.tsx`. Barrel export at `src/components/shared/index.ts`.
  Notes for later phases:
  - **i18n dictionary grew significantly** beyond Phase 1's 4 seed keys — added
    `nav.*` (5 tab labels), `status.*` (12 keys, one per value across
    `ProgramStatus`/`OrderStatus`/`RedemptionStatus`), and `common.*` (viewDetails,
    remove, total, noItemsYet, seatsLeft, download, share, showAtCounter). All three
    languages (en/hi/te) filled in together — keep doing this per-phase rather than
    batching translations at the end.
  - **`StatusBadge` takes camelCase keys** (`BadgeStatus = keyof Dictionary["status"]`),
    but domain status values are kebab-case (e.g. `"filling-fast"`, `"checked-in"`).
    Use the exported `toBadgeStatus()` helper from
    `src/components/shared/status-badge.tsx` to convert — don't hand-map these:
    `<StatusBadge status={toBadgeStatus(program.status)} />`.
  - **RSC boundaries**: only components that actually need hooks/interactivity are
    `"use client"` (`BottomNav`, `LanguageSwitcher`, `StatusBadge`, `ItemCard`,
    `ProgramCard`, `PriceSummary`, `ReceiptCard`, `EmptyState`). `AppHeader`,
    `SectionCard`, and `loading-skeletons.tsx` have no directive and can be rendered
    from Server Components directly.
  - `ItemCard` exposes a `trailing?: ReactNode` slot (for Phase 5's uniform size
    picker) rather than baking size selection in now — keeps Phase 2 scope contained.
  - `ReceiptCard` takes optional `onDownload`/`onShare` callbacks (hidden if omitted)
    — Phase 6 wires real behavior; Phase 7 is expected to add a ticket-styled variant
    on top of this same component per `phases/phase7.md`, not a new component.
  - QR codes use `qrcode.react`'s `QRCodeSVG` (added as a new dependency — not in the
    original stack table, but it's the standard React QR library and needed nothing
    else).
  - Added shadcn `checkbox` component (used by `ItemCard`'s selection toggle).
  - `/dev/component-gallery` (linked from `/dev/kitchen-sink`) renders every
    component; `ItemCard`/`ProgramCard` sections pull live data through
    `src/lib/data-source` (Grade 6 books, all seed programs) via `useEffect`, so
    their loading-skeleton state is what actually renders during SSR (verified via
    curl — 39 skeleton elements present in the initial HTML) before client-side fetch
    resolves.
  - Verified: `tsc --noEmit` clean, `eslint` clean, dev server serves both dev pages
    at 200 with no console/server errors.
  - Not yet committed as of this log entry.

- **2026-07-31** — **Phase 1 done.** Scaffolded with `create-next-app` (had to bootstrap
  into a temp dir under a lowercase package name — npm rejects the capitalized
  `NirajPublicSchool` folder name as a package name — then moved the generated files
  into the repo root, keeping our own `CLAUDE.md` over the generated stub). Notable
  version reality vs. the phase prompt/CLAUDE.md's assumptions, for future phases:
  - **Next.js 16.2.12**, App Router, Turbopack dev server by default, React 19.2.4.
  - **Tailwind v4** — CSS-first config. There is no `tailwind.config.ts`; all theme
    tokens live in `src/app/globals.css` under `@theme inline` + `:root`. Any future
    phase that expects a JS/TS Tailwind config file should look here instead.
  - **shadcn/ui's CLI is a new major version** (`shadcn@4.x`, not the classic
    `shadcn-ui`). Init required `-b radix -p nova` (a "preset" system replaced the old
    base-color prompt); components.json `style` is `"radix-nova"`. `iconLibrary` is
    already `lucide` — no separate lucide-react install step was needed.
  - Brand tokens from `CLAUDE.md` are implemented as CSS custom properties in
    `globals.css`: `--ink`, `--sub`, `--line`, `--brand`, `--brand-2`, `--warm` (this
    is plan.html's amber "accent" — renamed to `warm` in code to avoid colliding with
    shadcn's own semantic `--accent`, which is the menu/hover surface token, not a
    brand color). Plus six `--section-*` / `--section-*-bg` pairs matching plan.html's
    fgroup color-coding (workspace/essentials/programs/pay/console/platform). All
    exposed as Tailwind utilities (`bg-brand`, `text-ink`, `bg-section-programs-bg`,
    etc.) via `@theme inline`. shadcn's semantic tokens (`--primary`, `--secondary`,
    `--muted`, `--destructive`, `--radius`, …) are mapped onto this palette rather than
    left as shadcn defaults — `--radius` is `1.125rem` to match plan.html's 18px cards.
  - Fonts: `next/font/google` loads **Inter** (`--font-inter`, body/`font-sans`) and
    **Poppins** (`--font-poppins`, headings/`font-heading`) in `src/app/layout.tsx`;
    replaced the scaffold's default Geist fonts. All `h1`–`h6` get `font-heading` via
    a `@layer base` rule.
  - Folder architecture, domain types (`src/types`), mock fixtures (`src/lib/mock`),
    and the data-access layer (`src/lib/data-source`) were built exactly per
    `phases/phase1.md`. One real seed school ("Niraj Public School", Pune) with 4 class
    levels (Grade 1/3/6/9), books/uniform/stationery per class, 4 sample programs, and
    2 sample user profiles. Every data-source function simulates latency via a shared
    `withDelay()` helper in `src/lib/data-source/_internal.ts`.
  - i18n: `src/i18n` has a `Dictionary` type, `en`/`hi`/`te` dictionaries (4 keys seeded:
    `appName`, `language`, `continueLabel`, `welcome`), and a `LanguageProvider` +
    `useTranslation()` hook. Implementation detail worth knowing: language persistence
    uses `useSyncExternalStore` against `localStorage`, **not** a `useEffect` + `setState`
    read-on-mount — the new `eslint-plugin-react-hooks` (`react-hooks/set-state-in-effect`)
    rejects that pattern outright, and `useSyncExternalStore` is the correct fix (also
    avoids the extra hydration render pass). Follow this pattern for any future
    "read persisted client state on mount" needs rather than re-introducing the effect
    version.
  - `/dev/kitchen-sink` (linked from a temporary `/` placeholder) proves the whole
    foundation: brand/section color swatches, both fonts, a few themed shadcn
    components, and live `en`/`hi`/`te` switching. `src/app/page.tsx` is a temporary
    placeholder — Phase 3 replaces `/` with the real language-selector/login flow.
  - Verified: `npx tsc --noEmit` clean, `npm run lint` clean, dev server boots and both
    `/` and `/dev/kitchen-sink` return 200 with correct content.
  - Not yet committed to git as of this log entry — commits happen only when the user
    explicitly asks.

- **2026-07-31** — Repo initialized. `plan.html` (feature brief) and the pptx version
  already existed. Created `phases/phase1.md`–`phase10.md`, root `CLAUDE.md`, this file,
  and `.claude/DECISIONS.md`. No app code written yet — next step is Phase 1.
