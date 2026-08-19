"use client";

/**
 * Shared SWR hooks for the console's most-repeated reads (school id, class
 * levels). Every console page that needs these was independently
 * useEffect-fetching them on mount with no cache or dedup between pages —
 * these hooks give every page the same cached, deduped data instead, plus
 * an easy `mutate` for optimistic updates (e.g. "Add new class" inline).
 */

import useSWR, { type KeyedMutator } from "swr";
import { getClassLevelsBySchool, getSchools } from "@/lib/data-source";
import type { ClassLevel } from "@/types";

/** There's only one seed school today (see getSchools) — every console page just needs its id. */
export function useConsoleSchoolId(): string {
  const { data: schools } = useSWR("console:schools", getSchools);
  return schools?.[0]?.id ?? "";
}

export function useClassLevels(schoolId: string): {
  classLevels: ClassLevel[];
  mutateClassLevels: KeyedMutator<ClassLevel[]>;
} {
  const { data, mutate } = useSWR(
    schoolId ? ["console:class-levels", schoolId] : null,
    () => getClassLevelsBySchool(schoolId),
  );
  return { classLevels: data ?? [], mutateClassLevels: mutate };
}

/** Wire directly into ClassLevelSelect's onClassLevelsChange — writes the merged array into cache without an extra refetch. */
export function classLevelsCacheUpdater(mutate: KeyedMutator<ClassLevel[]>) {
  return (levels: ClassLevel[]) => {
    mutate(levels, { revalidate: false });
  };
}
