import type { Timetable, TimetableNote, TimetablePeriod } from "@/types";
import { payloadCreate, payloadDelete, payloadFind, payloadUpdate } from "./payload-rest";

interface PayloadTimetableDoc {
  id: string;
  school: string;
  classLevel: string;
  periods?: TimetablePeriod[] | null;
  notes?: TimetableNote[] | null;
  createdAt: string;
  updatedAt: string;
}

function toTimetable(doc: PayloadTimetableDoc): Timetable {
  return {
    id: doc.id,
    schoolId: doc.school,
    classLevelId: doc.classLevel,
    periods: doc.periods ?? [],
    notes: doc.notes ?? [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** One timetable per school + class level — null if staff haven't published one yet. */
export async function getTimetableByClassLevel(
  schoolId: string,
  classLevelId: string,
): Promise<Timetable | null> {
  const docs = await payloadFind<PayloadTimetableDoc>("timetables", {
    school: schoolId,
    classLevel: classLevelId,
  });
  return docs[0] ? toTimetable(docs[0]) : null;
}

export interface TimetableInput {
  schoolId: string;
  classLevelId: string;
  periods: TimetablePeriod[];
  notes: TimetableNote[];
}

/** Console — Timetable Manager. */
export async function createTimetable(input: TimetableInput): Promise<Timetable> {
  const doc = await payloadCreate<PayloadTimetableDoc>("timetables", {
    school: input.schoolId,
    classLevel: input.classLevelId,
    periods: input.periods,
    notes: input.notes,
  });
  return toTimetable(doc);
}

export async function updateTimetable(id: string, patch: Partial<TimetableInput>): Promise<Timetable | null> {
  const doc = await payloadUpdate<PayloadTimetableDoc>("timetables", id, {
    ...(patch.periods !== undefined ? { periods: patch.periods } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
  });
  return doc ? toTimetable(doc) : null;
}

export async function deleteTimetable(id: string): Promise<void> {
  await payloadDelete("timetables", id);
}
