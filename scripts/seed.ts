/**
 * Populates Payload with the exact demo content from src/lib/mock/* so the
 * school sees the same catalogue/programs after the Phase 9 migration as
 * they approved during the mock-data UI phase. Intended usage:
 *
 *   npm run payload:seed
 *
 * KNOWN ISSUE (2026-07-31, this environment): running this standalone
 * script currently crashes with `Cannot destructure property
 * 'loadEnvConfig' of ... undefined`, from Payload's own env-loading helper
 * trying to import `@next/env`. This is an upstream CJS/ESM interop
 * mismatch between `@next/env`@16.2.12's bundled output and how `tsx`/
 * Node 24 resolve its default export — not a bug in this app's config or
 * collections (confirmed: `next build` and `next dev` both load
 * payload.config.ts and every collection successfully; only this
 * standalone-script code path is affected). See .claude/PROGRESS.md for
 * the full note. Until that's resolved, use the equivalent dev-only route
 * instead: start `npm run dev` and POST to /api/seed.
 */
import { getPayload } from "payload";
import config from "../payload.config";
import { seedPayload } from "../src/lib/seed-payload";

async function seed() {
  const payload = await getPayload({ config });
  console.log("Seeding Payload from src/lib/mock/* ...");
  await seedPayload(payload);
  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
