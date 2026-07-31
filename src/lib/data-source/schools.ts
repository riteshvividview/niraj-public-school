import type { ClassLevel, School } from "@/types";
import { MOCK_CLASS_LEVELS, MOCK_SCHOOL } from "@/lib/mock/school";
import { withDelay } from "./_internal";

/** Only one seed school today — registration's school picker is still a real list/select so adding more is a data change, not a UI rewrite. */
export async function getSchools(): Promise<School[]> {
  return withDelay([MOCK_SCHOOL]);
}

export async function getSchoolBySlug(slug: string): Promise<School | null> {
  return withDelay(MOCK_SCHOOL.slug === slug ? MOCK_SCHOOL : null);
}

export async function getSchoolById(id: string): Promise<School | null> {
  return withDelay(MOCK_SCHOOL.id === id ? MOCK_SCHOOL : null);
}

export async function getClassLevelsBySchool(schoolId: string): Promise<ClassLevel[]> {
  return withDelay(
    MOCK_CLASS_LEVELS.filter((level) => level.schoolId === schoolId).sort((a, b) => a.order - b.order),
  );
}

export async function getClassLevelById(id: string): Promise<ClassLevel | null> {
  return withDelay(MOCK_CLASS_LEVELS.find((level) => level.id === id) ?? null);
}
