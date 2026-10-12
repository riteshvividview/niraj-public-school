import { NextResponse } from "next/server";
import { getNewAdmissionSummary } from "@/lib/server/uniform/new-admission";
import { getRequestActor, jsonError } from "@/lib/server/request-actor";

interface Queryable {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
}
const num = (v: unknown) => Number(v ?? 0);

/**
 * Console — the one place that joins every feature together for the Reports Dashboard and the
 * navigation: what needs a decision (exchange / subject-change / support / extra-item requests,
 * payments needing review), how payment attempts are going, which items of a purchased book set
 * have still not been handed over, and where the new admissions stand. School-wide, staff only.
 */
export async function GET(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind !== "staff") return jsonError("Only school staff can see this.", 403);
  const { payload } = actor;
  const schoolId = new URL(request.url).searchParams.get("schoolId") ?? "";
  if (!schoolId) return jsonError("Missing school.", 400);
  const pool = (payload.db as unknown as { pool: Queryable }).pool;
  const one = async (text: string) => (await pool.query(text, [schoolId])).rows[0] ?? {};

  const [requests, attempts, outstanding, topOutstanding, newAdmission] = await Promise.all([
    one(`SELECT
        (SELECT count(*) FROM exchange_requests WHERE school_id = $1 AND status = 'pending') AS exchanges,
        (SELECT count(*) FROM book_change_requests WHERE school_id = $1 AND status = 'pending') AS subject_changes,
        (SELECT count(*) FROM support_requests WHERE school_id = $1 AND status = 'open') AS support,
        (SELECT count(*) FROM extra_item_requests WHERE school_id = $1 AND status = 'pending') AS extra_items`),
    one(`SELECT
        count(*) FILTER (WHERE status = 'paid') AS paid,
        count(*) FILTER (WHERE status = 'pending') AS pending,
        count(*) FILTER (WHERE status = 'failed') AS failed,
        count(*) FILTER (WHERE status IN ('cancelled', 'expired')) AS abandoned,
        count(*) FILTER (WHERE needs_review) AS needs_review
       FROM payments WHERE school_id = $1 AND created_at > now() - interval '30 days'`),
    one(`SELECT count(DISTINCT o.id) AS receipts, count(*) AS items
       FROM orders_items_parts p JOIN orders_items oi ON oi.id = p._parent_id JOIN orders o ON o.id = oi._parent_id
      WHERE o.school_id = $1 AND o.status = 'paid' AND p.collected_at IS NULL`),
    pool.query(
      `SELECT p.name, count(*) AS students, sum(p.quantity) AS quantity
         FROM orders_items_parts p JOIN orders_items oi ON oi.id = p._parent_id JOIN orders o ON o.id = oi._parent_id
        WHERE o.school_id = $1 AND o.status = 'paid' AND p.collected_at IS NULL
        GROUP BY p.name ORDER BY count(*) DESC, p.name LIMIT 8`,
      [schoolId],
    ),
    getNewAdmissionSummary(payload, schoolId),
  ]);
  const allReview = await one(`SELECT count(*) AS n FROM payments WHERE school_id = $1 AND needs_review`);

  return NextResponse.json({
    requests: {
      exchanges: num(requests.exchanges),
      subjectChanges: num(requests.subject_changes),
      support: num(requests.support),
      extraItems: num(requests.extra_items),
    },
    payments30d: {
      paid: num(attempts.paid),
      pending: num(attempts.pending),
      failed: num(attempts.failed),
      abandoned: num(attempts.abandoned),
    },
    paymentsNeedingReview: num(allReview.n),
    outstandingItems: {
      receipts: num(outstanding.receipts),
      items: num(outstanding.items),
      top: topOutstanding.rows.map((row) => ({ name: String(row.name), students: num(row.students), quantity: num(row.quantity) })),
    },
    newAdmission: {
      academicYear: newAdmission.academicYear,
      newCount: newAdmission.newCount,
      setBoughtCount: newAdmission.setBoughtCount,
      waitingCount: newAdmission.newCount - newAdmission.setBoughtCount,
    },
  });
}
