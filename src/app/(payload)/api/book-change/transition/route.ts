import { NextResponse } from "next/server";
import type { Payload } from "payload";
import { bookChangeCancelledByStudentEmail, bookChangeDecisionEmail } from "@/lib/email/request-templates";
import { selectionLabels } from "@/lib/server/book-change-labels";
import { getRequestActor, jsonError, relId } from "@/lib/server/request-actor";
import { eventActor, recordRequestEvent } from "@/lib/server/record-events";
import { getExtraNotifyEmail, getStaffRecipients, sendEmailsSafely } from "@/lib/server/request-notify";

type Action = "cancel" | "approve" | "reject" | "note";
const ACTIONS: Action[] = ["cancel", "approve", "reject", "note"];
const NOTE_MIN = 3;

interface Queryable {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount: number | null }>;
}
function pool(payload: Payload): Queryable {
  return (payload.db as unknown as { pool: Queryable }).pool;
}

/**
 * Every status change of a subject-change request.
 *   student : cancel (own request, while pending)
 *   staff   : approve (applies the change to the student's profile, atomically,
 *             in SQL) · reject (note required) · note (staff-only contact log)
 */
export async function POST(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind === "anonymous") return jsonError("Please log in.", 401);
  const { payload } = actor;

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const action = body?.action as Action;
  const staffNote = typeof body?.staffNote === "string" ? body.staffNote.trim() : "";
  if (!id || !ACTIONS.includes(action)) return jsonError("Invalid request.", 400);

  const doc = await payload.findByID({ collection: "book-change-requests", id, depth: 0 }).catch(() => null);
  if (!doc) return jsonError("We couldn't find that request.", 404);
  const schoolId = relId(doc.school);

  if (actor.kind === "student") {
    if (action !== "cancel") return jsonError("You can't do that.", 403);
    if (relId(doc.user) !== actor.user.id) return jsonError("We couldn't find that request.", 404);
    const res = await pool(payload).query(
      `UPDATE book_change_requests SET status = 'cancelled', updated_at = now() WHERE id = $1 AND status = 'pending' RETURNING id`,
      [id],
    );
    if (!res.rowCount) return jsonError("This request can no longer be cancelled.", 409);
    await logBookChange(payload, doc, "bookchange.cancelled", actor);
    try {
      const recipients = await getStaffRecipients(payload, schoolId);
      await sendEmailsSafely(
        recipients,
        `Subject change request withdrawn — ${String(actor.user.name ?? "student")}`,
        bookChangeCancelledByStudentEmail({
          student: { name: String(actor.user.name ?? ""), registerNumber: String(actor.user.username ?? "") },
          requested: selectionLabels(doc.requested as Record<string, unknown>),
        }),
      );
    } catch (error) {
      console.error("[book-change/transition] cancel notification failed:", error);
    }
    return NextResponse.json({ ok: true });
  }

  // ----- staff ---------------------------------------------------------------
  const staff = actor.user;
  const staffName = String(staff.name ?? staff.email ?? "Staff");

  if (action === "note") {
    const contactNote = typeof body?.contactNote === "string" ? body.contactNote.trim().slice(0, 1000) : "";
    await payload.update({ collection: "book-change-requests", id, data: { contactNote }, depth: 0 });
    return NextResponse.json({ ok: true });
  }
  if (action === "cancel") return jsonError("Staff can approve or reject a request.", 400);
  if (staffNote.length > 500) return jsonError("Keep the note under 500 characters.", 400);

  if (action === "reject") {
    if (staffNote.length < NOTE_MIN) return jsonError("Please add a short note explaining the decision.", 400);
    const res = await pool(payload).query(
      `UPDATE book_change_requests
          SET status = 'rejected', staff_note = $2, decided_by_id = $3, decided_by_name = $4, decided_at = now(), updated_at = now()
        WHERE id = $1 AND status = 'pending' RETURNING id`,
      [id, staffNote, staff.id, staffName],
    );
    if (!res.rowCount) return jsonError("This request was already handled.", 409);
  } else {
    try {
      await pool(payload).query(`SELECT approve_book_change_request($1::uuid, $2::uuid, $3::text, $4::text)`, [
        id,
        staff.id,
        staffName,
        staffNote,
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/BOOKCHANGE_BAD_STATUS/.test(message)) return jsonError("This request was already handled.", 409);
      console.error("[book-change/transition] approve failed:", error);
      return jsonError("We couldn't approve the request. Nothing was changed.", 500);
    }
  }

  await logBookChange(payload, doc, action === "approve" ? "bookchange.approved" : "bookchange.rejected", actor, staffNote || undefined);
  await notifyStudent(payload, doc, action === "approve" ? "approved" : "rejected", staffNote || undefined);
  return NextResponse.json({ ok: true });
}

const EVENT_TEXT: Record<string, string> = {
  "bookchange.cancelled": "Subject change cancelled",
  "bookchange.approved": "Subject change approved",
  "bookchange.rejected": "Subject change rejected",
};

async function logBookChange(
  payload: Payload,
  doc: Record<string, unknown>,
  eventType: string,
  actor: { kind: string; user?: { id: string; name?: string; email?: string } },
  note?: string,
) {
  const requested = selectionLabels(doc.requested as Record<string, unknown>);
  const asText = [requested.secondLanguage, requested.stream, requested.elective].filter(Boolean).join(" · ");
  await recordRequestEvent(payload, doc, {
    eventType,
    entityType: "bookchange",
    actor: eventActor(actor),
    summary: `${EVENT_TEXT[eventType]}: ${asText}${note ? ` — ${note}` : ""}`,
    details: { requested: doc.requested, current: doc.current, note: note ?? null },
  });
}

async function notifyStudent(
  payload: Payload,
  doc: Record<string, unknown>,
  outcome: "approved" | "rejected",
  staffNote?: string,
) {
  try {
    const student = await payload.findByID({ collection: "users", id: relId(doc.user), depth: 0 }).catch(() => null);
    const html = bookChangeDecisionEmail({
      outcome,
      requested: selectionLabels(doc.requested as Record<string, unknown>),
      staffNote,
    });
    const subject = outcome === "approved" ? "Your subject change was approved" : "Update on your subject change request";
    const recipients: Array<{ email: string; name?: string }> = [];
    const studentEmail = String(student?.email ?? "").trim().toLowerCase();
    if (studentEmail) recipients.push({ email: studentEmail, name: student?.name as string | undefined });
    const extra = await getExtraNotifyEmail(payload, relId(doc.school));
    if (extra && extra !== studentEmail) recipients.push({ email: extra });
    if (recipients.length === 0) {
      console.info(`[book-change] no email on file for ${String(student?.name ?? "student")} — decision email skipped`);
      return;
    }
    await sendEmailsSafely(recipients, subject, html);
  } catch (error) {
    console.error("[book-change/transition] notification failed:", error);
  }
}
