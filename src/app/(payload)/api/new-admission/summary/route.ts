import { NextResponse } from "next/server";
import { academicYearLabel, academicYearStart } from "@/lib/academic-year";
import { getAcademicYearStartMonth, getNewAdmissionSummary } from "@/lib/server/uniform/new-admission";
import { getRequestActor, jsonError } from "@/lib/server/request-actor";

/** Console — Catalogue Manager's New Admission section: the academic year, how many students are new, and who still has to buy the set. */
export async function GET(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind !== "staff") return jsonError("Only school staff can see this.", 403);
  const { payload } = actor;
  const params = new URL(request.url).searchParams;
  const schoolId = params.get("schoolId") ?? "";
  if (!schoolId) return jsonError("Missing school.", 400);

  // `light` = just the academic year (the Students screens use it to badge new admissions) — skips the roster scan.
  if (params.get("light")) {
    const startMonth = await getAcademicYearStartMonth(payload, schoolId);
    return NextResponse.json({ academicYear: academicYearLabel(academicYearStart(new Date(), startMonth)), startMonth, totalStudents: 0, newCount: 0, setBoughtCount: 0, overrides: 0, waiting: [] });
  }
  return NextResponse.json(await getNewAdmissionSummary(payload, schoolId));
}
