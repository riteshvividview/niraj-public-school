import { NextResponse } from "next/server";
import { getRequestActor, jsonError } from "@/lib/server/request-actor";

interface Queryable {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
}
const num = (v: unknown) => Number(v ?? 0);

/**
 * Console — the numbers on top of the Subject Changes log: how many students changed their book choice,
 * how many changes in total, and of which kind (2nd language / main group / secondary specialization).
 * Counts every change that really happened (made directly, or approved under the old request flow).
 */
export async function GET(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind !== "staff") return jsonError("Only school staff can see this.", 403);
  const schoolId = new URL(request.url).searchParams.get("schoolId") ?? "";
  if (!schoolId) return jsonError("Missing school.", 400);
  const pool = (actor.payload.db as unknown as { pool: Queryable }).pool;
  const row =
    (
      await pool.query(
        `SELECT count(*) AS changes,
                count(DISTINCT user_id) AS students,
                count(*) FILTER (WHERE requested_second_language IS NOT NULL) AS language_changes,
                count(*) FILTER (WHERE requested_stream IS NOT NULL) AS stream_changes,
                count(*) FILTER (WHERE requested_elective IS NOT NULL) AS elective_changes,
                count(*) FILTER (WHERE changed_by_type = 'student') AS by_students,
                count(*) FILTER (WHERE changed_by_type = 'staff') AS by_staff
           FROM book_change_requests
          WHERE school_id = $1 AND status IN ('applied', 'approved')`,
        [schoolId],
      )
    ).rows[0] ?? {};
  return NextResponse.json({
    changes: num(row.changes),
    students: num(row.students),
    languageChanges: num(row.language_changes),
    streamChanges: num(row.stream_changes),
    electiveChanges: num(row.elective_changes),
    byStudents: num(row.by_students),
    byStaff: num(row.by_staff),
  });
}
