"use client";

import { Calendar } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { registeredProgramIds as computeRegisteredProgramIds } from "@/lib/cart-items";
import { getPrograms, getReceiptsByUser, isProgramEligibleForClass } from "@/lib/data-source";
import { useAuth } from "@/store/auth-store";
import type { Program } from "@/types";

const FEE_BRACKETS = [500, 1000, 2000, 5000];

type SortOption = "date" | "fee-asc" | "fee-desc";

const ALL = "all";

export default function ProgramsFeedPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [registeredProgramIds, setRegisteredProgramIds] = useState<Set<string>>(new Set());

  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [maxFee, setMaxFee] = useState<string>(ALL);
  const [sortBy, setSortBy] = useState<SortOption>("date");

  // Category is free text now (see Programs.ts) — the filter's option list
  // is derived from whatever categories actually exist, fetched once
  // unfiltered, rather than a fixed preset list.
  useEffect(() => {
    getPrograms({}).then((all) => {
      setCategoryOptions(Array.from(new Set(all.map((program) => program.category))).sort());
    });
  }, []);

  useEffect(() => {
    if (!profile) return;
    getReceiptsByUser(profile.id).then((records) => setRegisteredProgramIds(computeRegisteredProgramIds(records)));
  }, [profile]);

  useEffect(() => {
    // Guard against out-of-order responses: if the filters change again
    // before this request resolves, its (now stale) result must not
    // overwrite whatever the latest filter selection fetched.
    let cancelled = false;
    getPrograms({
      category: categoryFilter === ALL ? undefined : categoryFilter,
      dateFrom: dateFrom || undefined,
      maxFee: maxFee === ALL ? undefined : Number(maxFee),
    }).then((result) => {
      if (!cancelled) setPrograms(result);
    });
    return () => {
      cancelled = true;
    };
  }, [categoryFilter, dateFrom, maxFee]);

  const sortedPrograms = useMemo(() => {
    if (!programs) return null;
    const eligible = profile
      ? programs.filter((program) => isProgramEligibleForClass(program, profile.classLevelId))
      : programs;
    const copy = [...eligible];
    if (sortBy === "date") copy.sort((a, b) => a.date.localeCompare(b.date));
    else if (sortBy === "fee-asc") copy.sort((a, b) => a.fee - b.fee);
    else copy.sort((a, b) => b.fee - a.fee);
    return copy;
  }, [programs, sortBy, profile]);

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
                {categoryOptions.map((category) => (
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

        {sortedPrograms === null ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProgramCardSkeleton key={i} />
            ))}
          </div>
        ) : sortedPrograms.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={t.programsPage.noResultsTitle}
            description={t.programsPage.noResultsDescription}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sortedPrograms.map((program) => (
              <ProgramCard
                key={program.id}
                title={program.title}
                date={program.date}
                venue={program.venue}
                fee={program.fee}
                seatsAvailable={program.seatsAvailable}
                status={program.status}
                registered={registeredProgramIds.has(program.id)}
                href={`/programs/${program.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
