import { NextResponse } from "next/server";
import { getNewAdmissionStatus } from "@/lib/server/uniform/new-admission";
import { getRequestActor, jsonError } from "@/lib/server/request-actor";

interface Queryable {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
}
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v));

/**
 * Console — Student detail: everything the school has going on with ONE student, from every
 * feature, in one call: their requests (exchange, subject change, extra item, support), their
 * payment attempts, and where they stand on the new-admission uniform set. Staff only.
 */
export async function GET(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind !== "staff") return jsonError("Only school staff can see this.", 403);
  const { payload } = actor;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return jsonError("Missing student.", 400);
  const pool = (payload.db as unknown as { pool: Queryable }).pool;
  const rows = async (text: string) => (await pool.query(text, [id])).rows;

  const [exchanges, subjectChanges, extraItems, support, payments, newAdmission] = await Promise.all([
    rows(`SELECT id, item_label, from_size, to_size, status, created_at FROM exchange_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`),
    rows(`SELECT id, status, reason, created_at FROM book_change_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`),
    rows(`SELECT id, item_label, size, status, created_at FROM extra_item_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`),
    rows(`SELECT id, message, status, created_at FROM support_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`),
    rows(`SELECT id, status, amount, provider, failure_reason, needs_review, created_at FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`),
    getNewAdmissionStatus(payload, id).catch(() => null),
  ]);

  return NextResponse.json({
    exchanges: exchanges.map((r) => ({ id: String(r.id), label: `${String(r.item_label)}: ${String(r.from_size)} → ${String(r.to_size)}`, status: String(r.status), createdAt: iso(r.created_at) })),
    subjectChanges: subjectChanges.map((r) => ({ id: String(r.id), label: String(r.reason), status: String(r.status), createdAt: iso(r.created_at) })),
    extraItems: extraItems.map((r) => ({ id: String(r.id), label: `${String(r.item_label)} (${String(r.size)})`, status: String(r.status), createdAt: iso(r.created_at) })),
    support: support.map((r) => ({ id: String(r.id), label: String(r.message), status: String(r.status), createdAt: iso(r.created_at) })),
    payments: payments.map((r) => ({
      id: String(r.id),
      label: `₹${Number(r.amount).toLocaleString("en-IN")} via ${String(r.provider) === "simulated" ? "test mode" : String(r.provider)}${r.failure_reason ? ` — ${String(r.failure_reason)}` : ""}`,
      status: String(r.status),
      needsReview: Boolean(r.needs_review),
      createdAt: iso(r.created_at),
    })),
    newAdmission: newAdmission ? { isNew: newAdmission.isNew, setBought: newAdmission.setBought, academicYear: newAdmission.academicYear } : null,
  });
}
