import { NextResponse } from "next/server";
import type { Payload } from "payload";
import { exchangeCancelledByParentEmail, exchangeDecisionEmail } from "@/lib/email/request-templates";
import { EXCHANGE_STAFF_NOTE_MIN } from "@/lib/exchange-rules";
import { getExtraNotifyEmail, getStaffRecipients, sendEmailsSafely } from "@/lib/server/request-notify";
import { getRequestActor, jsonError, relId } from "@/lib/server/request-actor";

type Action = "cancel" | "approve" | "reject" | "complete" | "note";
const ACTIONS: Action[] = ["cancel", "approve", "reject", "complete", "note"];

interface Queryable {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount: number | null }>;
}
function pool(payload: Payload): Queryable {
  return (payload.db as unknown as { pool: Queryable }).pool;
}

/**
 * Every status change of an exchange request. The caller is authenticated
 * from the session cookie, the allowed transition depends on WHO they are,
 * and each change is a single conditional UPDATE (`WHERE status = <expected>`),
 * so two people acting at once can't both succeed.
 *
 *   student : cancel (own request, while pending)
 *   staff   : approve / reject (pending) · cancel (pending|approved) ·
 *             complete (approved — moves stock atomically, in SQL) · note (any)
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

  const doc = await payload.findByID({ collection: "exchange-requests", id, depth: 0 }).catch(() => null);
  if (!doc) return jsonError("We couldn't find that exchange request.", 404);

  const schoolId = relId(doc.school);
  const studentId = relId(doc.user);

  // ----- student: cancel own pending request --------------------------------
  if (actor.kind === "student") {
    if (action !== "cancel") return jsonError("You can't do that.", 403);
    if (studentId !== actor.user.id) return jsonError("We couldn't find that exchange request.", 404);
    const res = await pool(payload).query(
      `UPDATE exchange_requests SET status = 'cancelled', updated_at = now() WHERE id = $1 AND status = 'pending' RETURNING id`,
      [id],
    );
    if (!res.rowCount) return jsonError("This request can no longer be cancelled.", 409);
    await notifyStaffOfCancellation(payload, doc, actor.user.name ?? "", String(actor.user.username ?? ""));
    return NextResponse.json({ ok: true });
  }

  // ----- staff ---------------------------------------------------------------
  const staff = actor.user;
  const staffName = String(staff.name ?? staff.email ?? "Staff");

  if (action === "note") {
    const contactNote = typeof body?.contactNote === "string" ? body.contactNote.trim().slice(0, 1000) : "";
    await payload.update({ collection: "exchange-requests", id, data: { contactNote }, depth: 0 });
    return NextResponse.json({ ok: true });
  }

  if ((action === "reject" || action === "cancel") && staffNote.length < EXCHANGE_STAFF_NOTE_MIN) {
    return jsonError("Please add a short note explaining the decision.", 400);
  }
  if (staffNote.length > 500) return jsonError("Keep the note under 500 characters.", 400);

  let warning: string | undefined;

  if (action === "approve" || action === "reject") {
    const nextStatus = action === "approve" ? "approved" : "rejected";
    const res = await pool(payload).query(
      `UPDATE exchange_requests
          SET status = $2, staff_note = $3, decided_by_id = $4, decided_by_name = $5, decided_at = now(), updated_at = now()
        WHERE id = $1 AND status = 'pending' RETURNING id`,
      [id, nextStatus, staffNote || null, staff.id, staffName],
    );
    if (!res.rowCount) return jsonError("This request was already handled.", 409);
    if (action === "approve") warning = await lowStockWarning(payload, doc);
  } else if (action === "cancel") {
    const res = await pool(payload).query(
      `UPDATE exchange_requests
          SET status = 'cancelled', staff_note = $2, decided_by_id = $3, decided_by_name = $4, decided_at = now(), updated_at = now()
        WHERE id = $1 AND status IN ('pending', 'approved') RETURNING id`,
      [id, staffNote, staff.id, staffName],
    );
    if (!res.rowCount) return jsonError("This request can no longer be cancelled.", 409);
  } else {
    // complete — atomic stock movement lives in the SQL function.
    const returnToStock = body?.returnToStock !== false;
    try {
      await pool(payload).query(`SELECT complete_exchange_request($1::uuid, $2::uuid, $3::text, $4::boolean)`, [
        id,
        staff.id,
        staffName,
        returnToStock,
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const stock = message.match(/EXCHANGE_INSUFFICIENT_STOCK:(\d+(?:\.\d+)?)/);
      if (stock) {
        return jsonError(
          `Not enough stock of size ${String(doc.toSize)} (only ${Number(stock[1])} on hand). Update the stock first, then complete the exchange.`,
          409,
          { reason: "insufficient-stock" },
        );
      }
      if (/EXCHANGE_BAD_STATUS/.test(message)) return jsonError("This request isn't in an approved state.", 409);
      console.error("[exchange/transition] complete failed:", error);
      return jsonError("We couldn't complete the exchange. Nothing was changed.", 500);
    }
  }

  await notifyFamily(payload, doc, action, staffNote || undefined);
  return NextResponse.json({ ok: true, warning });
}

async function lowStockWarning(payload: Payload, doc: Record<string, unknown>): Promise<string | undefined> {
  const stock = await payload.find({
    collection: "essentials-stock",
    where: {
      and: [
        { school: { equals: relId(doc.school) } },
        { kind: { equals: "uniform" } },
        { refId: { equals: String(doc.uniformItemId) } },
        { variantKey: { equals: String(doc.toSize) } },
      ],
    },
    limit: 1,
    depth: 0,
  });
  const row = stock.docs[0];
  if (!row) return undefined; // untracked product — nothing to warn about
  const onHand = Number(row.quantityOnHand);
  return onHand < Number(doc.quantity)
    ? `Only ${onHand} of size ${String(doc.toSize)} in stock — restock before completing this exchange.`
    : undefined;
}

async function notifyFamily(payload: Payload, doc: Record<string, unknown>, action: Action, staffNote?: string) {
  try {
    const outcome = (
      { approve: "approved", reject: "rejected", complete: "completed", cancel: "cancelled" } as Record<string, string>
    )[action] as "approved" | "rejected" | "completed" | "cancelled" | undefined;
    if (!outcome) return;

    const [student, receipt] = await Promise.all([
      payload.findByID({ collection: "users", id: relId(doc.user), depth: 0 }).catch(() => null),
      payload.findByID({ collection: "receipts", id: relId(doc.receipt), depth: 0 }).catch(() => null),
    ]);
    const html = exchangeDecisionEmail({
      outcome,
      receiptCode: String(receipt?.qrPayload ?? ""),
      itemLabel: String(doc.itemLabel),
      fromSize: String(doc.fromSize),
      toSize: String(doc.toSize),
      quantity: Number(doc.quantity),
      staffNote,
      priceDifference: Number(doc.priceDifference),
    });
    const subject = {
      approved: "Your uniform exchange was approved",
      rejected: "Update on your uniform exchange request",
      completed: "Your uniform exchange is complete",
      cancelled: "Your uniform exchange request was cancelled",
    }[outcome];

    const recipients: Array<{ email: string; name?: string }> = [];
    const studentEmail = String(student?.email ?? "").trim().toLowerCase();
    if (studentEmail) recipients.push({ email: studentEmail, name: student?.name as string | undefined });
    // The extra notification inbox receives every update, not just new requests.
    const extra = await getExtraNotifyEmail(payload, relId(doc.school));
    if (extra && extra !== studentEmail) recipients.push({ email: extra });
    if (recipients.length === 0) {
      console.info(`[exchange] no email on file for ${String(student?.name ?? "student")} — decision email skipped`);
      return;
    }
    await sendEmailsSafely(recipients, subject, html);
  } catch (error) {
    console.error("[exchange/transition] notification failed:", error);
  }
}

async function notifyStaffOfCancellation(
  payload: Payload,
  doc: Record<string, unknown>,
  studentName: string,
  registerNumber: string,
) {
  try {
    const receipt = await payload.findByID({ collection: "receipts", id: relId(doc.receipt), depth: 0 }).catch(() => null);
    const recipients = await getStaffRecipients(payload, relId(doc.school));
    await sendEmailsSafely(
      recipients,
      `Exchange request withdrawn — ${studentName}`,
      exchangeCancelledByParentEmail({
        student: { name: studentName, registerNumber },
        receiptCode: String(receipt?.qrPayload ?? ""),
        itemLabel: String(doc.itemLabel),
        fromSize: String(doc.fromSize),
        toSize: String(doc.toSize),
      }),
    );
  } catch (error) {
    console.error("[exchange/transition] cancel notification failed:", error);
  }
}
