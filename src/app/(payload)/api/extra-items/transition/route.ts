import { NextResponse } from "next/server";
import type { Payload } from "payload";
import { sendTransactionalEmail } from "@/lib/email/brevo";
import { extraItemDecisionEmail } from "@/lib/email/request-templates";
import { eventActor, recordRequestEvent } from "@/lib/server/record-events";
import { getRequestActor, jsonError, relId } from "@/lib/server/request-actor";

type Action = "approve" | "reject" | "cancel";
interface Queryable {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount: number | null }>;
}
const pool = (payload: Payload) => (payload.db as unknown as { pool: Queryable }).pool;

/**
 * approve / reject — school staff only (pending → approved | rejected);
 * cancel — the student who asked (pending | approved → cancelled).
 * Each is one conditional UPDATE, so two people acting at once can't both succeed.
 */
export async function POST(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind === "anonymous") return jsonError("Please log in.", 401);
  const { payload } = actor;
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const action = body?.action as Action;
  if (!id || !["approve", "reject", "cancel"].includes(action)) return jsonError("Invalid request.", 400);

  const doc = (await payload.findByID({ collection: "extra-item-requests", id, depth: 0 }).catch(() => null)) as Record<string, unknown> | null;
  if (!doc) return jsonError("We couldn't find that request.", 404);

  if (action === "cancel") {
    if (actor.kind !== "student" || relId(doc.user) !== actor.user.id) return jsonError("You can only cancel your own request.", 403);
    const res = await pool(payload).query(
      `UPDATE extra_item_requests SET status = 'cancelled', updated_at = now() WHERE id = $1 AND status IN ('pending', 'approved') RETURNING id`,
      [id],
    );
    if (!res.rowCount) return jsonError("This request can't be cancelled any more.", 409);
    await recordRequestEvent(payload, doc, {
      eventType: "extra.cancelled",
      entityType: "extra-item",
      actor: eventActor(actor),
      summary: `Cancelled the request for ${String(doc.itemLabel)} (${String(doc.size)})`,
    });
    return NextResponse.json({ ok: true });
  }

  if (actor.kind !== "staff") return jsonError("Only school staff can do that.", 403);
  const staff = actor.user;
  const staffName = String(staff.name ?? staff.email ?? "Staff");
  const staffNote = typeof body?.staffNote === "string" ? body.staffNote.trim() : "";
  if (staffNote.length > 500) return jsonError("Keep the note under 500 characters.", 400);
  const next = action === "approve" ? "approved" : "rejected";
  const res = await pool(payload).query(
    `UPDATE extra_item_requests SET status = $2, staff_note = NULLIF($3, ''), handled_by_id = $4, handled_by_name = $5, handled_at = now(), updated_at = now()
      WHERE id = $1 AND status = 'pending' RETURNING id`,
    [id, next, staffNote, staff.id, staffName],
  );
  if (!res.rowCount) return jsonError("This request was already decided by someone else.", 409);

  await recordRequestEvent(payload, doc, {
    eventType: action === "approve" ? "extra.approved" : "extra.rejected",
    entityType: "extra-item",
    actor: eventActor(actor),
    summary: `${action === "approve" ? "Approved" : "Declined"} the request for ${String(doc.itemLabel)} (${String(doc.size)})${staffNote ? ` — ${staffNote}` : ""}`,
    details: { note: staffNote || null },
  });
  try {
    const student = (await payload.findByID({ collection: "users", id: relId(doc.user), depth: 0 })) as unknown as Record<string, unknown>;
    if (student.email) {
      await sendTransactionalEmail({
        to: String(student.email),
        toName: String(student.name),
        subject: action === "approve" ? "Your extra uniform item is approved" : "About your extra uniform item request",
        html: extraItemDecisionEmail({ approved: action === "approve", itemLabel: String(doc.itemLabel), size: String(doc.size), staffNote: staffNote || undefined }),
      });
    }
  } catch (error) {
    console.error("[extra-items/transition] notification failed:", error);
  }
  return NextResponse.json({ ok: true });
}
