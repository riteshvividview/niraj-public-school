"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { FilterRow } from "@/components/shared/filter-row";
import { ConsoleListSkeleton } from "@/components/shared/console-list-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getBookChangeRequestsPageBySchool, type BookChangePageFilters } from "@/lib/data-source";
import { formatDate } from "@/lib/format";
import { useClassLevels, useConsoleSchoolId } from "@/lib/hooks/console-data";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { BookChangeStatus } from "@/types";
import {
  BookChangeDetailSheet,
  changeLines,
  STATUS_LABELS,
  STATUS_STYLES,
} from "../../subject-change-requests/_components/book-change-detail-sheet";

const ALL_VALUE = "__all__";
const PAGE_SIZE = 20;

type StatusFilter = BookChangeStatus | typeof ALL_VALUE;
const STATUS_TABS: Array<{ value: StatusFilter; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: ALL_VALUE, label: "All" },
];

export function SubjectChangeRequestsTab() {
  const schoolId = useConsoleSchoolId();
  const { classLevels } = useClassLevels(schoolId);
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [classLevelId, setClassLevelId] = useState(ALL_VALUE);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const filters: BookChangePageFilters = {
    status: status !== ALL_VALUE ? status : undefined,
    search: debouncedSearch.trim() || undefined,
    classLevelId: classLevelId !== ALL_VALUE ? classLevelId : undefined,
  };

  const filtersKey = JSON.stringify(filters);
  const [seenFiltersKey, setSeenFiltersKey] = useState(filtersKey);
  if (filtersKey !== seenFiltersKey) {
    setSeenFiltersKey(filtersKey);
    setPage(1);
  }
  const effectivePage = filtersKey === seenFiltersKey ? page : 1;

  const { data, isValidating, mutate } = useSWR(
    schoolId ? ["console:book-change-requests", schoolId, filtersKey, effectivePage] : null,
    () => getBookChangeRequestsPageBySchool(schoolId, filters, effectivePage, PAGE_SIZE),
    { keepPreviousData: true, refreshInterval: 60_000 },
  );
  const records = data?.records ?? null;
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const classLabelById = new Map(classLevels.map((level) => [level.id, level.label]));
  const selected = records?.find((r) => r.id === selectedId) ?? null;
  const hasActiveFilters = search.trim() !== "" || classLevelId !== ALL_VALUE;

  function refresh() {
    void mutate();
    void globalMutate(["console:book-change-pending", schoolId]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-semibold text-ink">Subject Change Requests</h2>
        <p className="text-sm text-sub">
          Students can&apos;t switch their assigned language or specialization themselves — they ask here. Call the parent if you
          want to confirm, then approve (the profile updates automatically) or reject.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                  status === tab.value
                    ? "border-section-console bg-section-console text-white"
                    : "border-line text-sub hover:bg-muted hover:text-ink",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <FilterRow>
            <div className="min-w-48 flex-1 space-y-1.5">
              <Label htmlFor="book-change-search" className="text-xs text-sub">
                Search
              </Label>
              <Input
                id="book-change-search"
                placeholder="Student name or register number"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-40 space-y-1.5">
              <Label className="text-xs text-sub">Class</Label>
              <Select value={classLevelId} onValueChange={setClassLevelId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All Classes</SelectItem>
                  {classLevels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setClassLevelId(ALL_VALUE);
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </FilterRow>

          {records !== null ? (
            <p className="text-sm text-sub">
              {totalCount === 0
                ? "0 requests"
                : `${(effectivePage - 1) * PAGE_SIZE + 1}–${Math.min(effectivePage * PAGE_SIZE, totalCount)} of ${totalCount} requests`}
            </p>
          ) : null}

          {records === null ? (
            <ConsoleListSkeleton />
          ) : records.length === 0 ? (
            <p className="rounded-xl border border-line/60 py-10 text-center text-sm text-sub">
              {status === "pending" && !hasActiveFilters ? "No pending requests." : "No requests match these filters."}
            </p>
          ) : (
            <div className={cn("space-y-2 transition-opacity", isValidating && "opacity-60")}>
              {records.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelectedId(record.id)}
                  className="block w-full cursor-pointer rounded-xl border border-line/60 p-3.5 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{record.student.name}</p>
                      <p className="text-xs text-sub">
                        {record.student.registerNumber} · {classLabelById.get(record.student.classLevelId) ?? "—"}
                        {record.student.section ? ` - ${record.student.section}` : ""}
                      </p>
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[record.status])}>
                      {STATUS_LABELS[record.status]}
                    </span>
                  </div>
                  <div className="mt-2 space-y-0.5 text-sm text-ink">
                    {changeLines(record).map((line) => (
                      <p key={line.label} className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sub">{line.label}:</span> {line.from}
                        <ArrowRight className="size-3 text-sub" />
                        <span className="font-semibold">{line.to}</span>
                      </p>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-sub">Requested {formatDate(record.createdAt)}</p>
                </button>
              ))}
            </div>
          )}

          {records !== null && totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={effectivePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <p className="text-xs text-sub">
                Page {effectivePage} of {totalPages}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={effectivePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <BookChangeDetailSheet
        record={selected}
        classLabel={selected ? (classLabelById.get(selected.student.classLevelId) ?? "—") : ""}
        onClose={() => setSelectedId(null)}
        onChanged={refresh}
      />
    </div>
  );
}
