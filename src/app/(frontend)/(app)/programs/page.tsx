"use client";

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import useSWR, { preload } from "swr";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ProgramCardSkeleton } from "@/components/shared/loading-skeletons";
import { ProgramCard } from "@/components/shared/program-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n/context";
import { getProgramCategories, getProgramsPage, getRegisteredProgramIds } from "@/lib/data-source";
import { useAuth } from "@/store/auth-store";

const FEE_BRACKETS = [500, 1000, 2000, 5000];
const PAGE_SIZE = 12;

type SortOption = "date" | "fee-asc" | "fee-desc";

const ALL = "all";

const SORT_TO_API: Record<SortOption, "date" | "fee" | "-fee"> = {
  date: "date",
  "fee-asc": "fee",
  "fee-desc": "-fee",
};

export default function ProgramsFeedPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [maxFee, setMaxFee] = useState<string>(ALL);
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [page, setPage] = useState(1);

  // Category is free text now (see Programs.ts) — the filter's option list is
  // derived from whatever categories actually exist across every school
  // (Programs & Events is the one cross-school surface), select-trimmed
  // rather than a full unfiltered fetch.
  const { data: categoryOptions } = useSWR("program-categories", getProgramCategories);

  const { data: registeredProgramIds } = useSWR(profile ? ["registered-program-ids", profile.id] : null, () =>
    getRegisteredProgramIds(profile!.id),
  );

  const filters = {
    category: categoryFilter === ALL ? undefined : categoryFilter,
    dateFrom: dateFrom || undefined,
    maxFee: maxFee === ALL ? undefined : Number(maxFee),
    classLevelId: profile?.classLevelId,
  };
  const filtersKey = JSON.stringify(filters) + sortBy;

  // Reset to page 1 whenever filters/sort change — in-render state
  // adjustment (not an effect), same pattern the console's Payments/Students
  // pages use.
  const [seenFiltersKey, setSeenFiltersKey] = useState(filtersKey);
  if (filtersKey !== seenFiltersKey) {
    setSeenFiltersKey(filtersKey);
    setPage(1);
  }
  const effectivePage = filtersKey === seenFiltersKey ? page : 1;

  const { data: pageData } = useSWR(
    ["programs", filtersKey, effectivePage],
    () => getProgramsPage(filters, effectivePage, PAGE_SIZE, SORT_TO_API[sortBy]),
    { keepPreviousData: true },
  );
  const programs = pageData?.programs ?? null;
  const totalPages = pageData?.totalPages ?? 1;

  if (pageData && effectivePage < pageData.totalPages) {
    const nextPage = effectivePage + 1;
    void preload(["programs", filtersKey, nextPage], () =>
      getProgramsPage(filters, nextPage, PAGE_SIZE, SORT_TO_API[sortBy]),
    );
  }

  const hasActiveFilters = categoryFilter !== ALL || dateFrom !== "" || maxFee !== ALL;

  function clearFilters() {
    setCategoryFilter(ALL);
    setDateFrom("");
    setMaxFee(ALL);
  }

  return (
    <>
      <AppHeader title={t.nav.programs} showAvatar />
      <div className="w-full space-y-4 p-4 pb-8 sm:space-y-5 sm:p-6 lg:p-8">
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-line/60 bg-card p-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs text-sub">{t.programsPage.filterCategoryLabel}</label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t.programsPage.filterAllCategories}</SelectItem>
                {(categoryOptions ?? []).map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label htmlFor="date-from" className="text-xs text-sub">
              {t.programsPage.filterDateFromLabel}
            </label>
            <input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-8 w-full cursor-pointer rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-sub">{t.programsPage.filterMaxFeeLabel}</label>
            <Select value={maxFee} onValueChange={setMaxFee}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t.programsPage.filterAnyFee}</SelectItem>
                {FEE_BRACKETS.map((amount) => (
                  <SelectItem key={amount} value={String(amount)}>
                    ₹{amount}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 flex items-end justify-between gap-3 sm:col-span-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-sub">{t.programsPage.filterSortLabel}</label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">{t.programsPage.sortDate}</SelectItem>
                  <SelectItem value="fee-asc">{t.programsPage.sortFeeAsc}</SelectItem>
                  <SelectItem value="fee-desc">{t.programsPage.sortFeeDesc}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {t.programsPage.clearFilters}
              </Button>
            ) : null}
          </div>
        </div>

        {programs === null ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProgramCardSkeleton key={i} />
            ))}
          </div>
        ) : programs.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={t.programsPage.noResultsTitle}
            description={t.programsPage.noResultsDescription}
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {programs.map((program) => (
                <ProgramCard
                  key={program.id}
                  title={program.title}
                  date={program.date}
                  venue={program.venue}
                  fee={program.fee}
                  seatsAvailable={program.seatsAvailable}
                  status={program.status}
                  registered={registeredProgramIds?.has(program.id) ?? false}
                  href={`/programs/${program.id}`}
                />
              ))}
            </div>
            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-3 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={effectivePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                  {t.common.previous}
                </Button>
                <p className="text-xs text-sub">
                  {t.common.pageOf} {effectivePage} / {totalPages}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={effectivePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t.common.next}
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
