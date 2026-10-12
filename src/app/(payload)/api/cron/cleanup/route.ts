import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { timingSafeEqual } from "node:crypto";

/**
 * Daily housekeeping (scheduled in vercel.json): removes expired login sessions, expired "remember this
 * device" tokens and stale one-time codes. Business records are never touched.
 * Called by Vercel Cron with `Authorization: Bearer $CRON_SECRET`; refuses everything else.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  const ok = Boolean(secret) && given.length === secret!.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret!));
  if (!ok) return NextResponse.json({ error: "Not allowed." }, { status: 401 });

  const payload = await getPayload({ config });
  const pool = (payload.db as unknown as { pool: { query: (text: string) => Promise<{ rows: Array<{ cleanup_expired_auth_rows: unknown }> }> } }).pool;
  const result = await pool.query("SELECT cleanup_expired_auth_rows()");
  return NextResponse.json({ ok: true, removed: result.rows[0]?.cleanup_expired_auth_rows });
}
