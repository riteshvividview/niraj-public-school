"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { FilterRow } from "@/components/shared/filter-row";
import { ConsoleListSkeleton } from "@/components/shared/console-list-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getBookChangeRequestsPageBySchool, type BookChangePageFilters } from "@/lib/data-source";
import { formatDate, formatTime } from "@/lib/format";
import { useClassLevels, useConsoleSchoolId } from "@/lib/hooks/console-data";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { BookChangeRequestRecord, BookSelection } from "@/types";

const ALL_VALUE = "__all__";
const PAGE_SIZE = 20;

const NAMES: Record<string, string> = { hindi: "Hindi", telugu: "Telugu", science: "Science", economics: "Economics", ena: "ENA", roboticsAI: "Robotics & AI", homeScience: "Home Science" };
const FIELDS: Array<{ key: keyof BookSelection; label: string }> = [
  { key: "secondLanguage", label: "2nd language" },
  { key: "stream", label: "Main group" },
  { key: "elective", label: "Secondary specialization" },
];

/** "2nd language: Telugu → Hindi" for every part that changed. */
function changeLines(record: Pick<BookChangeRequestRecord, "current" | "requested">) {
  return FIELDS.filter((f) => record.requested[f.key]).map((f) => ({
    label: f.label,
    from: record.current[f.key] ? NAMES[record.current[f.key]!] : "—",
    to: NAMES[record.requested[f.key]!],
  }));
}

interface Stats {
  changes: number;
  students: number;
  languageChanges: number;
  streamChanges: number;
  electiveChanges: number;
  byStudents: number;
  byStaff: number;
}

async function getStats(schoolId: string): Promise<Stats> {
  const res = await fetch(`/api/console/subject-changes?schoolId=${encodeURIComponent(schoolId)}`, { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) throw new Error("Could not load the numbers.");
  return (await res.json()) as Stats;
}

/**
 * Subject Changes — a read-only LOG (no approvals): every time a student changed their 2nd language,
 * main group or secondary specialization (themselves, before buying books, after confirming), or staff
 * changed it on the student's profile — with the class they were in and the exact time.
 */
export function SubjectChangeRequestsTab() {
  const schoolId = useConsoleSchoolId();
  const { classLevels } = useClassLevels(schoolId);
  const [search, setSearch] = useState("");
  const [classLevelId, setClassLevelId] = useState(ALL_VALUE);
  const [changedBy, setChangedBy] = useState(ALL_VALUE);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const filters: BookChangePageFilters = {
    search: debouncedSearch.trim() || undefined,
    classLevelId: classLevelId !== ALL_VALUE ? classLevelId : undefined,
    changedBy: changedBy !== ALL_VALUE ? (changedBy as "student" | "staff") : undefined,
  };

  const filtersKey = JSON.stringify(filters);
  const [seenFiltersKey, setSeenFiltersKey] = useState(filtersKey);
  if (filtersKey !== seenFiltersKey) {
    setSeenFiltersKey(filtersKey);
    setPage(1);
  }
  const effectivePage = filtersKey === seenFiltersKey ? page : 1;

  const { data, isValidating } = useSWR(
    schoolId ? ["console:subject-change-log", schoolId, filtersKey, effectivePage] : null,
    () => getBookChangeRequestsPageBySchool(schoolId, filters, effectivePage, PAGE_SIZE),
    { keepPreviousData: true, refreshInterval: 60_000 },
  );
  const { data: stats } = useSWR(schoolId ? ["console:subject-change-stats", schoolId] : null, () => getStats(schoolId), { refreshInterval: 60_000 });
  const records = data?.records ?? null;
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const classLabelById = new Map(classLevels.map((level) => [level.id, level.label]));
  const hasActiveFilters = search.trim() !== "" || classLevelId !== ALL_VALUE || changedBy !== ALL_VALUE;

  const statCards: Array<{ label: string; value: number | undefined }> = [
    { label: "Students who changed", value: stats?.students },
    { label: "Changes in total", value: stats?.changes },
    { label: "2nd language", value: stats?.languageChanges },
    { label: "Main group", value: stats?.streamChanges },
    { label: "Secondary specialization", value: stats?.electiveChanges },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-semibold text-ink">Subject Changes</h2>
        <p className="text-sm text-sub">
          A record of every change to a student&apos;s 2nd language, main group or secondary specialization — made by the student
          (after confirming, before buying books) or by staff on the student&apos;s profile. Nothing here needs approval.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-line/60 bg-card p-4">
            <p className="font-heading text-2xl font-bold text-ink">{card.value ?? "…"}</p>
            <p className="text-xs text-sub">{card.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Change log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FilterRow>
            <div className="min-w-48 flex-1 space-y-1.5">
              <Label htmlFor="subject-change-search" className="text-xs text-sub">
                Search
              </Label>
              <Input id="subject-change-search" placeholder="Student name or register number" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="w-44 space-y-1.5">
              <Label className="text-xs text-sub">Class at the time</Label>
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
            <div className="w-40 space-y-1.5">
              <Label className="text-xs text-sub">Changed by</Label>
              <Select value={changedBy} onValueChange={setChangedBy}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>Anyone</SelectItem>
                  <SelectItem value="student">Student / parent</SelectItem>
                  <SelectItem value="staff">School staff</SelectItem>
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
                  setChangedBy(ALL_VALUE);
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </FilterRow>

          {records !== null ? (
            <p className="text-sm text-sub">
              {totalCount === 0
                ? "0 changes"
                : `${(effectivePage - 1) * PAGE_SIZE + 1}–${Math.min(effectivePage * PAGE_SIZE, totalCount)} of ${totalCount} changes`}
            </p>
          ) : null}

          {records === null ? (
            <ConsoleListSkeleton />
          ) : records.length === 0 ? (
            <p className="rounded-xl border border-line/60 py-10 text-center text-sm text-sub">
              {hasActiveFilters ? "No changes match these filters." : "No subject changes yet."}
            </p>
          ) : (
            <ul className={cn("space-y-2 transition-opacity", isValidating && "opacity-60")}>
              {records.map((record) => {
                const classAtTime = record.classLabel ?? (record.classLevelId ? classLabelById.get(record.classLevelId) : undefined);
                const when = record.decidedAt ?? record.createdAt;
                return (
                  <li key={record.id} className="rounded-xl border border-line/60 p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{record.student.name}</p>
                        <p className="text-xs text-sub">
                          {record.student.registerNumber}
                          {classAtTime ? ` · in ${classAtTime}` : ""}
                          {record.student.section ? ` - ${record.student.section}` : ""}
                        </p>
                      </div>
                      <span className="text-right text-xs text-sub">
                        {formatDate(when)}, {formatTime(when)}
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
                    <p className="mt-1 text-xs text-sub">
                      {record.changedByType === "staff"
                        ? `Changed by staff${record.changedByName ? ` (${record.changedByName})` : ""}`
                        : record.changedByType === "student"
                          ? "Chosen by the student / parent"
                          : `Approved by ${record.decidedByName ?? "staff"} (old request)`}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          {records !== null && totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <Button variant="outline" size="sm" className="gap-1.5" disabled={effectivePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <p className="text-xs text-sub">
                Page {effectivePage} of {totalPages}
              </p>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={effectivePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
