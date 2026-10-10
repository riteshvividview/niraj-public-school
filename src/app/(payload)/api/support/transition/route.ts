import { NextResponse } from "next/server";
import type { Payload } from "payload";
import { eventActor, recordRequestEvent } from "@/lib/server/record-events";
import { getRequestActor, jsonError } from "@/lib/server/request-actor";

type Action = "start" | "resolve" | "reopen" | "note";
const ACTIONS: Action[] = ["start", "resolve", "reopen", "note"];

interface Queryable {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount: number | null }>;
}
function pool(payload: Payload): Queryable {
  return (payload.db as unknown as { pool: Queryable }).pool;
}

/**
 * Staff-only status changes for a support query. Each is one conditional
 * UPDATE (`WHERE status = <expected>`), so two staff acting at once can't
 * both succeed.
 *   start   open → in-progress   ("I'm contacting them")
 *   resolve open|in-progress → resolved (optional note)
 *   reopen  resolved → open
 *   note    save the staff-only contact log
 */
export async function POST(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind === "anonymous") return jsonError("Please log in.", 401);
  if (actor.kind !== "staff") return jsonError("Only school staff can do that.", 403);
  const { payload, user: staff } = actor;

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const action = body?.action as Action;
  if (!id || !ACTIONS.includes(action)) return jsonError("Invalid request.", 400);

  const doc = await payload.findByID({ collection: "support-requests", id, depth: 0 }).catch(() => null);
  if (!doc) return jsonError("We couldn't find that query.", 404);

  if (action === "note") {
    const contactNote = typeof body?.contactNote === "string" ? body.contactNote.trim().slice(0, 1000) : "";
    await payload.update({ collection: "support-requests", id, data: { contactNote }, depth: 0 });
    return NextResponse.json({ ok: true });
  }

  const staffName = String(staff.name ?? staff.email ?? "Staff");
  const staffNote = typeof body?.staffNote === "string" ? body.staffNote.trim() : "";
  if (staffNote.length > 500) return jsonError("Keep the note under 500 characters.", 400);

  let res;
  if (action === "start") {
    res = await pool(payload).query(
      `UPDATE support_requests SET status = 'in-progress', handled_by_id = $2, handled_by_name = $3, handled_at = now(), updated_at = now()
        WHERE id = $1 AND status = 'open' RETURNING id`,
      [id, staff.id, staffName],
    );
  } else if (action === "resolve") {
    res = await pool(payload).query(
      `UPDATE support_requests
          SET status = 'resolved', staff_note = COALESCE(NULLIF($2, ''), staff_note), handled_by_id = $3, handled_by_name = $4,
              handled_at = now(), resolved_at = now(), updated_at = now()
        WHERE id = $1 AND status IN ('open', 'in-progress') RETURNING id`,
      [id, staffNote, staff.id, staffName],
    );
  } else {
    res = await pool(payload).query(
      `UPDATE support_requests SET status = 'open', resolved_at = NULL, updated_at = now() WHERE id = $1 AND status = 'resolved' RETURNING id`,
      [id],
    );
  }
  if (!res.rowCount) return jsonError("This query was already updated by someone else.", 409);
  const eventType = { start: "support.started", resolve: "support.resolved", reopen: "support.reopened" }[action];
  const text = { start: "Support query picked up", resolve: "Support query resolved", reopen: "Support query reopened" }[action];
  await recordRequestEvent(payload, doc, {
    eventType,
    entityType: "support",
    actor: eventActor(actor),
    summary: `${text}${action === "resolve" && staffNote ? ` — ${staffNote}` : ""}`,
    details: { note: staffNote || null },
  });
  return NextResponse.json({ ok: true });
}
