/**
 * Academic year + "new admission" rules. Pure functions — shared by the server
 * (which decides what a student may buy) and the console (which shows the counts).
 *
 * A student is NEW when the two digits at the start of their register number
 * (27NPS0123 → 27) are the year the CURRENT academic year ends in, or later. The academic
 * year starts in `startMonth` (April by default, editable in the console): with an April
 * start, 1 Apr 2026 – 31 Mar 2027 is "2026-27" and its new students are the 27… register
 * numbers (the school numbers new admissions by the academic year's second year). A staff override on
 * the student beats the register number (transfers, mid-year joiners, odd numbers).
 */
export type NewAdmissionOverride = "new" | "existing";

export const DEFAULT_ACADEMIC_YEAR_START_MONTH = 4;

/** The calendar year the current academic year started in, using India time. */
export function academicYearStart(now: Date, startMonth: number = DEFAULT_ACADEMIC_YEAR_START_MONTH): number {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth() + 1;
  return month >= startMonth ? year : year - 1;
}

/** "2026-27" */
export function academicYearLabel(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/** The year in a register number (27NPS0123 → 2027), or null if it doesn't start with two digits. */
export function registerYearOf(registerNumber: string | null | undefined): number | null {
  const match = /^(\d{2})/.exec((registerNumber ?? "").trim());
  return match ? 2000 + Number(match[1]) : null;
}

export function isNewAdmission(
  student: { registerNumber?: string | null; override?: NewAdmissionOverride | null },
  now: Date = new Date(),
  startMonth: number = DEFAULT_ACADEMIC_YEAR_START_MONTH,
): boolean {
  if (student.override === "new") return true;
  if (student.override === "existing") return false;
  const registered = registerYearOf(student.registerNumber);
  return registered !== null && registered >= academicYearStart(now, startMonth) + 1;
}

/** A new-admission item with an optional class range ("classes 1 to 5"), compared on the class sort order. */
export function newAdmissionItemApplies(
  item: { gender?: string | null; fromOrder?: number | null; toOrder?: number | null },
  student: { gender?: string | null; classOrder: number },
): boolean {
  if (item.gender && student.gender && item.gender !== student.gender) return false;
  if (item.fromOrder != null && student.classOrder < item.fromOrder) return false;
  if (item.toOrder != null && student.classOrder > item.toOrder) return false;
  return true;
}
