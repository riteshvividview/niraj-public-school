import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { ensureConsoleAdminSeed } from "@/lib/seed-console-admin";

/**
 * One-time, idempotent — creates the kept demo Console account
 * (admin@nirajpublicschool.edu.in) as a real payload-admins row if it
 * doesn't already exist. Safe to call again (no-ops once it exists) and
 * safe in production (unlike /api/seed, this never touches catalogue data).
 * Usage: POST to /api/seed-console-admin once, from either environment.
 */
export async function POST() {
  const payload = await getPayload({ config });
  const result = await ensureConsoleAdminSeed(payload);
  return NextResponse.json({ ok: true, created: result.created });
}
