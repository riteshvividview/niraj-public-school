import type { ClassLevel, School } from "@/types";
import { payloadCreate, payloadDelete, payloadFind, payloadFindById, payloadUpdate } from "./payload-rest";

interface PayloadSchoolDoc {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  logoUrl?: string | null;
  contactPhone: string;
  contactEmail: string;
  createdAt: string;
  updatedAt: string;
}

interface PayloadClassLevelDoc {
  id: string;
  school: string;
  label: string;
  board: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

function toSchool(doc: PayloadSchoolDoc): School {
  return {
    id: doc.id,
    name: doc.name,
    slug: doc.slug,
    city: doc.city,
    state: doc.state,
    logoUrl: doc.logoUrl ?? null,
    contactPhone: doc.contactPhone,
    contactEmail: doc.contactEmail,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toClassLevel(doc: PayloadClassLevelDoc): ClassLevel {
  return {
    id: doc.id,
    schoolId: doc.school,
    label: doc.label,
    board: doc.board,
    order: doc.order,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Schools and class levels are near-static (one school, a handful of
 * classes) but every console page fetches them fresh on mount — 7+
 * redundant round-trips per session. A simple in-memory cache (module-level,
 * so it's transparent to every existing call site — no page changes needed)
 * fixes that; in-flight promises are also deduped so two pages mounting at
 * once don't double-fetch. Mutations below (create/update/delete) clear the
 * relevant cache entry so staff never see stale data after an edit.
 */
let schoolsCache: School[] | null = null;
let schoolsInFlight: Promise<School[]> | null = null;
const classLevelsCache = new Map<string, ClassLevel[]>();
const classLevelsInFlight = new Map<string, Promise<ClassLevel[]>>();

/** Only one seed school today — registration's school picker is still a real list/select so adding more is a data change, not a UI rewrite. */
export async function getSchools(): Promise<School[]> {
  if (schoolsCache) return schoolsCache;
  if (!schoolsInFlight) {
    schoolsInFlight = payloadFind<PayloadSchoolDoc>("schools")
      .then((docs) => docs.map(toSchool))
      .finally(() => {
        schoolsInFlight = null;
      });
  }
  const schools = await schoolsInFlight;
  schoolsCache = schools;
  return schools;
}

export async function getSchoolBySlug(slug: string): Promise<School | null> {
  const cached = schoolsCache?.find((school) => school.slug === slug);
  if (cached) return cached;
  const docs = await payloadFind<PayloadSchoolDoc>("schools", { slug });
  return docs[0] ? toSchool(docs[0]) : null;
}

export async function getSchoolById(id: string): Promise<School | null> {
  const cached = schoolsCache?.find((school) => school.id === id);
  if (cached) return cached;
  const doc = await payloadFindById<PayloadSchoolDoc>("schools", id);
  return doc ? toSchool(doc) : null;
}

export async function getClassLevelsBySchool(schoolId: string): Promise<ClassLevel[]> {
  const cached = classLevelsCache.get(schoolId);
  if (cached) return cached;
  let inFlight = classLevelsInFlight.get(schoolId);
  if (!inFlight) {
    inFlight = payloadFind<PayloadClassLevelDoc>("class-levels", { school: schoolId })
      .then((docs) => docs.map(toClassLevel).sort((a, b) => a.order - b.order))
      .finally(() => {
        classLevelsInFlight.delete(schoolId);
      });
    classLevelsInFlight.set(schoolId, inFlight);
  }
  const levels = await inFlight;
  classLevelsCache.set(schoolId, levels);
  return levels;
}

/** Checks every already-cached school's class-level list first (usually already warm from a getClassLevelsBySchool call) before hitting the network. */
export async function getClassLevelById(id: string): Promise<ClassLevel | null> {
  for (const levels of classLevelsCache.values()) {
    const cached = levels.find((level) => level.id === id);
    if (cached) return cached;
  }
  const doc = await payloadFindById<PayloadClassLevelDoc>("class-levels", id);
  return doc ? toClassLevel(doc) : null;
}

export interface ClassLevelInput {
  schoolId: string;
  label: string;
  board: string;
  order: number;
}

/** Console — Students tab's "Add new class" flow (also usable anywhere a class picker lives). */
export async function createClassLevel(input: ClassLevelInput): Promise<ClassLevel> {
  const doc = await payloadCreate<PayloadClassLevelDoc>("class-levels", {
    school: input.schoolId,
    label: input.label,
    board: input.board,
    order: input.order,
  });
  classLevelsCache.delete(input.schoolId);
  return toClassLevel(doc);
}

export async function updateClassLevel(
  id: string,
  patch: Partial<Omit<ClassLevelInput, "schoolId">>,
): Promise<ClassLevel | null> {
  const doc = await payloadUpdate<PayloadClassLevelDoc>("class-levels", id, patch);
  classLevelsCache.clear();
  return doc ? toClassLevel(doc) : null;
}

export async function deleteClassLevel(id: string): Promise<void> {
  await payloadDelete("class-levels", id);
  classLevelsCache.clear();
}
