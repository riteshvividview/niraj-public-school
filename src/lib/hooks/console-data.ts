"use client";

/**
 * Shared SWR hooks for the console's most-repeated reads (school id, class
 * levels). Every console page that needs these was independently
 * useEffect-fetching them on mount with no cache or dedup between pages —
 * these hooks give every page the same cached, deduped data instead, plus
 * an easy `mutate` for optimistic updates (e.g. "Add new class" inline).
 */

import useSWR, { type KeyedMutator } from "swr";
import {
  getClassLevelsBySchool,
  getEssentialsStockBySchool,
  getPaymentCoverageBySchool,
  getOpenSupportCount,
  getPendingBookChangeCount,
  countPendingExtraItemRequests, getNewAdmissionSummary, getPendingExchangeCount,
  getPaymentsBySchool,
  getProgramReportBySchool,
  getSchools,
  type ReportFilter,
} from "@/lib/data-source";
import type { ClassLevel, PaymentRecord } from "@/types";

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

/**
 * Canonical hook for getEssentialsStockBySchool — one shared key so the
 * low-stock nav badge and the Stock page reuse the same fetch instead of
 * issuing two independent requests for identical data.
 */
export function useEssentialsStock(schoolId: string) {
  const { data, mutate } = useSWR(
    schoolId ? ["console:essentials-stock", schoolId] : null,
    () => getEssentialsStockBySchool(schoolId),
  );
  return { stockRows: data, mutateStockRows: mutate };
}

/**
 * Canonical hook for getPaymentsBySchool — the Reports Dashboard's own tiles
 * and the two report-derivations that internally call getPaymentsBySchool
 * (getPaymentCoverageBySchool, getProgramReportBySchool) all key off this
 * same tuple, so they share one underlying fetch via SWR's dedup instead of
 * three independent whole-collection requests.
 */
export function useSchoolPayments(schoolId: string): PaymentRecord[] | undefined {
  const { data } = useSWR(schoolId ? ["console:payments", schoolId] : null, () => getPaymentsBySchool(schoolId));
  return data;
}

/** Canonical hook for getPaymentCoverageBySchool — shared by the dashboard tile and its /reports/payment-coverage drill-down. */
export function usePaymentCoverage(schoolId: string) {
  return useSWR(schoolId ? ["console:payment-coverage", schoolId] : null, () => getPaymentCoverageBySchool(schoolId));
}

/** Canonical hook for getProgramReportBySchool — shared by the dashboard tile and its /reports/programs drill-down. Keyed by filter so a filtered dashboard view and the unfiltered drill-down don't collide. */
export function useProgramReport(schoolId: string, filter?: ReportFilter) {
  return useSWR(
    schoolId ? ["console:program-report", schoolId, filter?.fromDate, filter?.toDate, filter?.classLevelId] : null,
    () => getProgramReportBySchool(schoolId, filter),
  );
}

/**
 * Requests waiting for a staff decision — drives the red badges on the
 * "Exchange Requests" / "Subject Change Requests" nav items. Polled lightly
 * so a request raised while staff are logged in shows up without a reload.
 */
export function usePendingExchangeCount(schoolId: string): number {
  const { data } = useSWR(schoolId ? ["console:exchange-pending", schoolId] : null, () => getPendingExchangeCount(schoolId), {
    refreshInterval: 60_000,
  });
  return data ?? 0;
}

/** Same idea as usePendingExchangeCount, for the "Subject Change Requests" nav badge. */
export function usePendingBookChangeCount(schoolId: string): number {
  const { data } = useSWR(schoolId ? ["console:book-change-pending", schoolId] : null, () => getPendingBookChangeCount(schoolId), {
    refreshInterval: 60_000,
  });
  return data ?? 0;
}

/** The school's academic year (and its start month) — lets the Students screens badge new admissions. One shared fetch. */
export function useNewAdmissionInfo(schoolId: string): { startMonth: number; academicYear: string } | undefined {
  const { data } = useSWR(schoolId ? ["console:new-admission-info", schoolId] : null, () => getNewAdmissionSummary(schoolId, true), {
    refreshInterval: 10 * 60_000,
  });
  return data ? { startMonth: data.startMonth, academicYear: data.academicYear } : undefined;
}

/** Same idea as usePendingExchangeCount, for the "Extra Item Requests" nav badge. */
export function usePendingExtraItemCount(schoolId: string): number {
  const { data } = useSWR(schoolId ? ["console:extra-pending", schoolId] : null, () => countPendingExtraItemRequests(schoolId), {
    refreshInterval: 60_000,
  });
  return data ?? 0;
}

/** Same idea as usePendingExchangeCount, for the "Parent Support" nav badge (queries nobody has picked up yet). */
export function useOpenSupportCount(schoolId: string): number {
  const { data } = useSWR(schoolId ? ["console:support-open", schoolId] : null, () => getOpenSupportCount(schoolId), {
    refreshInterval: 60_000,
  });
  return data ?? 0;
}
