import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

/**
 * Dev-only fallback for `payload migrate:create` — see scripts/seed.ts's
 * header comment for the same underlying issue (Node 24 + tsx can't run the
 * standalone `payload` CLI in this environment: `ERR_REQUIRE_ASYNC_MODULE`
 * from `@payloadcms/richtext-lexical`'s top-level await). Runs inside
 * Next's own server runtime instead, which doesn't hit that bug.
 *
 * `migrate:create` never actually connects to a database — it diffs the
 * collection config against the last migration snapshot in src/migrations
 * (disableDBConnect: true, same as the real CLI does for this command) — so
 * this works even with a placeholder/unreachable DATABASE_URI.
 *
 * Usage: with the dev server running,
 * `curl -X POST "http://localhost:3000/api/generate-migration?name=add_program_tags"`
 * (name defaults to "init", only appropriate for the very first migration —
 * see supabase/README.md for turning the result into a real Supabase migration).
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 403 });
  }

  const migrationName = new URL(request.url).searchParams.get("name") ?? "init";

  process.env.PAYLOAD_MIGRATING = "true";
  const payload = await getPayload({ config, disableDBConnect: true, key: "migrate-create" });
  const adapter = payload.db as unknown as {
    createMigration: (args: {
      forceAcceptWarning?: boolean;
      migrationName?: string;
      payload: typeof payload;
    }) => Promise<void>;
  };
  await adapter.createMigration({ forceAcceptWarning: true, migrationName, payload });
  return NextResponse.json({ ok: true, migrationName });
}
