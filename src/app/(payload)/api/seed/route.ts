import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { seedPayload } from "@/lib/seed-payload";

/**
 * Dev-only fallback for scripts/seed.ts — see that file's header comment
 * for why the standalone script is currently blocked in this environment.
 * Runs inside Next's own server runtime (via `npm run dev`), which doesn't
 * hit that issue, so this is what's actually runnable right now.
 *
 * Usage: with the dev server running, POST to /api/seed (e.g.
 * `curl -X POST http://localhost:3000/api/seed`). Delete once
 * scripts/seed.ts works standalone, or once real seeding happens through
 * Payload's admin UI directly.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 403 });
  }

  const payload = await getPayload({ config });
  const result = await seedPayload(payload);
  return NextResponse.json({ ok: true, schoolId: result.schoolId });
}
