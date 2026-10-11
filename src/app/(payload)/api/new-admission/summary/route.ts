import { NextResponse } from "next/server";
import { academicYearLabel, academicYearStart, isNewAdmission, type NewAdmissionOverride } from "@/lib/academic-year";
import { getAcademicYearStartMonth } from "@/lib/server/uniform/new-admission";
import { getRequestActor, jsonError } from "@/lib/server/request-actor";

interface Queryable {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
}

/** Console — Catalogue Manager's New Admission section: the academic year, how many students are new, and who still has to buy the set. */
export async function GET(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind !== "staff") return jsonError("Only school staff can see this.", 403);
  const { payload } = actor;
  const schoolId = new URL(request.url).searchParams.get("schoolId") ?? "";
  if (!schoolId) return jsonError("Missing school.", 400);

  const pool = (payload.db as unknown as { pool: Queryable }).pool;
  const startMonth = await getAcademicYearStartMonth(payload, schoolId);
  const now = new Date();
  // `light` = just the academic year (used by the Students page to badge new admissions) — skips the roster scan.
  if (new URL(request.url).searchParams.get("light")) {
    return NextResponse.json({ academicYear: academicYearLabel(academicYearStart(now, startMonth)), startMonth, totalStudents: 0, newCount: 0, setBoughtCount: 0, overrides: 0, waiting: [] });
  }
  const students = (
    await pool.query(
      `SELECT u.id, u.name, u.username, u.new_admission_override AS override, u.class_level_id,
              EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id AND o.new_admission_set) AS set_bought
         FROM users u WHERE u.school_id = $1 AND u.role = 'student'`,
      [schoolId],
    )
  ).rows;
  const newOnes = students.filter((s) =>
    isNewAdmission({ registerNumber: String(s.username), override: (s.override as NewAdmissionOverride | null) ?? null }, now, startMonth),
  );
  const waiting = newOnes.filter((s) => !s.set_bought);
  return NextResponse.json({
    academicYear: academicYearLabel(academicYearStart(now, startMonth)),
    startMonth,
    totalStudents: students.length,
    newCount: newOnes.length,
    setBoughtCount: newOnes.length - waiting.length,
    overrides: students.filter((s) => s.override).length,
    waiting: waiting.slice(0, 100).map((s) => ({ id: String(s.id), name: String(s.name), registerNumber: String(s.username), classLevelId: String(s.class_level_id) })),
  });
}
