import type { Payload } from "payload";
import {
  academicYearLabel,
  academicYearStart,
  DEFAULT_ACADEMIC_YEAR_START_MONTH,
  isNewAdmission,
  newAdmissionItemApplies,
  type NewAdmissionOverride,
} from "@/lib/academic-year";
import { relId } from "@/lib/server/request-actor";

/**
 * Server-only. The new-admission rules, decided in ONE place:
 *   • who is "new" (register-number year vs the current academic year, or a staff override);
 *   • the full uniform set a new student must buy (the class's regular items for their gender
 *     + the new-admission items that apply to their class and gender);
 *   • whether they have already bought it (the database allows only one set order per student).
 */
type Doc = Record<string, unknown>;

export interface NewAdmissionStatus {
  isNew: boolean;
  /** The full set was already bought (once only). */
  setBought: boolean;
  startMonth: number;
  /** "2026-27" */
  academicYear: string;
}

export interface SetItem {
  id: string;
  name: string;
  category: string;
  newAdmission: boolean;
  sizeOptions: Array<{ size: string; price: number }>;
}

export async function getAcademicYearStartMonth(payload: Payload, schoolId: string): Promise<number> {
  const school = (await payload.findByID({ collection: "schools", id: schoolId, depth: 0 }).catch(() => null)) as Doc | null;
  const month = Number(school?.academicYearStartMonth);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : DEFAULT_ACADEMIC_YEAR_START_MONTH;
}

export async function getNewAdmissionStatus(payload: Payload, studentId: string, now: Date = new Date()): Promise<NewAdmissionStatus> {
  const student = (await payload.findByID({ collection: "users", id: studentId, depth: 0 })) as unknown as Doc;
  const startMonth = await getAcademicYearStartMonth(payload, relId(student.school));
  const isNew = isNewAdmission(
    { registerNumber: String(student.username ?? ""), override: (student.newAdmissionOverride as NewAdmissionOverride | null | undefined) ?? null },
    now,
    startMonth,
  );
  let setBought = false;
  if (isNew) {
    const bought = await payload.count({ collection: "orders", where: { and: [{ user: { equals: studentId } }, { newAdmissionSet: { equals: true } }] } });
    setBought = bought.totalDocs > 0;
  }
  return { isNew, setBought, startMonth, academicYear: academicYearLabel(academicYearStart(now, startMonth)) };
}

const toSetItem = (doc: Doc): SetItem => ({
  id: String(doc.id),
  name: String(doc.name),
  category: String(doc.category),
  newAdmission: Boolean(doc.newAdmission),
  sizeOptions: ((doc.sizeOptions as Array<{ size: string; price: number }>) ?? []).map((o) => ({ size: o.size, price: Number(o.price) })),
});

/** Every uniform item a student could buy in full: their class's regular items + the applicable new-admission items. */
export async function getStudentUniformCatalogue(payload: Payload, studentId: string): Promise<{ regular: SetItem[]; newAdmission: SetItem[] }> {
  const student = (await payload.findByID({ collection: "users", id: studentId, depth: 0 })) as unknown as Doc;
  const schoolId = relId(student.school);
  const classLevelId = relId(student.classLevel);
  const gender = (student.gender as string | undefined) || undefined;
  const classLevel = (await payload.findByID({ collection: "class-levels", id: classLevelId, depth: 0 })) as unknown as Doc;
  const classOrder = Number(classLevel.order);

  const regularDocs = await payload.find({
    collection: "uniform-items",
    where: { and: [{ school: { equals: schoolId } }, { classLevel: { equals: classLevelId } }, { retired: { not_equals: true } }, { newAdmission: { not_equals: true } }] },
    limit: 200,
    depth: 0,
    sort: "createdAt",
  });
  const newDocs = await payload.find({
    collection: "uniform-items",
    where: { and: [{ school: { equals: schoolId } }, { newAdmission: { equals: true } }, { retired: { not_equals: true } }] },
    limit: 200,
    depth: 0,
    sort: "createdAt",
  });
  const genderOk = (doc: Doc) => !doc.gender || !gender || doc.gender === gender;
  return {
    regular: (regularDocs.docs as unknown as Doc[]).filter(genderOk).map(toSetItem),
    newAdmission: (newDocs.docs as unknown as Doc[])
      .filter((doc) => newAdmissionItemApplies({ gender: doc.gender as string | undefined, fromOrder: doc.newAdmissionFromOrder as number | null, toOrder: doc.newAdmissionToOrder as number | null }, { gender, classOrder }))
      .map(toSetItem),
  };
}

/** The full set a new student must buy together (regular + new-admission items). */
export async function getRequiredSet(payload: Payload, studentId: string): Promise<SetItem[]> {
  const catalogue = await getStudentUniformCatalogue(payload, studentId);
  return [...catalogue.regular, ...catalogue.newAdmission];
}

interface Queryable {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
}

export interface NewAdmissionSummary {
  academicYear: string;
  startMonth: number;
  totalStudents: number;
  newCount: number;
  setBoughtCount: number;
  overrides: number;
  waiting: Array<{ id: string; name: string; registerNumber: string; classLevelId: string }>;
}

/** The school-wide picture: the academic year, how many students are new, who has bought the set and who hasn't. */
export async function getNewAdmissionSummary(payload: Payload, schoolId: string, now: Date = new Date()): Promise<NewAdmissionSummary> {
  const pool = (payload.db as unknown as { pool: Queryable }).pool;
  const startMonth = await getAcademicYearStartMonth(payload, schoolId);
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
  return {
    academicYear: academicYearLabel(academicYearStart(now, startMonth)),
    startMonth,
    totalStudents: students.length,
    newCount: newOnes.length,
    setBoughtCount: newOnes.length - waiting.length,
    overrides: students.filter((s) => s.override).length,
    waiting: waiting.slice(0, 100).map((s) => ({ id: String(s.id), name: String(s.name), registerNumber: String(s.username), classLevelId: String(s.class_level_id) })),
  };
}
