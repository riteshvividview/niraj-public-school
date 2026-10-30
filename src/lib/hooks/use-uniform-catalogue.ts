"use client";

import useSWR from "swr";
import { getClassLevelsBySchool, getMyNewAdmissionStatus, getNewAdmissionItemsFor, getUniformItemsByClass } from "@/lib/data-source";
import { useAuth } from "@/store/auth-store";
import type { NewAdmissionStatus, UniformItem } from "@/types";

/** set = new admission's full set · first-set = existing student's first order for this class (full list) · requests = extras need approval · normal = free choice */
export type UniformMode = "set" | "first-set" | "requests" | "normal";

/**
 * The uniform items THIS student is shown — one definition shared by the Essentials hub, the Uniform
 * page and anything that reconciles the cart against it, so they can never disagree (a mismatch is
 * what used to silently drop a new student's set from the cart):
 *   • existing student   → their class's regular items;
 *   • new admission      → the full set = regular items + the new-admission items that apply to them.
 * `items` is null until both the session status and the catalogue have loaded.
 */
export function useUniformCatalogue(): { items: UniformItem[] | null; mode: UniformMode; status: NewAdmissionStatus | undefined } {
  const { profile } = useAuth();
  // Whether this student is a NEW admission is decided on the server. If that call fails, fall back to the
  // normal list — the payment step enforces the real rule either way.
  const { data: status, error: statusError } = useSWR(profile ? ["na-status", profile.id] : null, () => getMyNewAdmissionStatus());
  const { data: all } = useSWR(profile ? ["uniform:catalogue+na", profile.schoolId, profile.classLevelId, profile.gender] : null, async () => {
    const levels = await getClassLevelsBySchool(profile!.schoolId);
    const classOrder = levels.find((level) => level.id === profile!.classLevelId)?.order ?? 0;
    const [regular, extra] = await Promise.all([
      getUniformItemsByClass(profile!.schoolId, profile!.classLevelId, profile!.gender),
      getNewAdmissionItemsFor(profile!.schoolId, classOrder, profile!.gender),
    ]);
    return [...regular, ...extra];
  });

  const mode: UniformMode = status?.isNew ? (status.setBought ? "requests" : "set") : status?.firstUniformDone === false ? "first-set" : "normal";
  const ready = Boolean(status || statusError);
  // New-admission items are for NEW admissions only — an existing student never sees them.
  const items = ready && all ? (mode === "normal" || mode === "first-set" ? all.filter((item) => !item.newAdmission) : all) : null;
  return { items, mode, status };
}
