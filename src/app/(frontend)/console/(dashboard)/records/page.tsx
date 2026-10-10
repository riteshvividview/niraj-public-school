"use client";

import { ChevronLeft, ChevronRight, Download, Loader2, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import useSWR from "swr";
import { RecordEventRow } from "@/components/console/record-event-list";
import { ConsoleListSkeleton } from "@/components/shared/console-list-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllRecordEventsBySchool, getRecordEventsPageBySchool, type RecordFilters } from "@/lib/data-source";
import { downloadCsv } from "@/lib/export-utils";
import { useConsoleSchoolId } from "@/lib/hooks/console-data";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { categoryOfEvent, eventLabel, RECORD_EVENT_CATEGORIES, type RecordEventCategory } from "@/lib/record-events";
import { cn } from "@/lib/utils";

const ALL_VALUE = "__all__";
const PAGE_SIZE = 30;

export default function RecordsPage() {
  return (
    <Suspense fallback={<ConsoleListSkeleton />}>
      <RecordsView />
    </Suspense>
  );
}

function RecordsView() {
  const schoolId = useConsoleSchoolId();
  const params = useSearchParams();
  // Deep link from a student's detail page: /console/records?q=<register number>
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState<string>(ALL_VALUE);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const filters: RecordFilters = {
    search: debouncedSearch.trim() || undefined,
    category: category !== ALL_VALUE ? (category as RecordEventCategory) : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };
  const filtersKey = JSON.stringify(filters);
  const [seenFiltersKey, setSeenFiltersKey] = useState(filtersKey);
  if (filtersKey !== seenFiltersKey) {
    setSeenFiltersKey(filtersKey);
    setPage(1);
  }
  const effectivePage = filtersKey === seenFiltersKey ? page : 1;

  const { data, isValidating } = useSWR(
    schoolId ? ["console:records", schoolId, filtersKey, effectivePage] : null,
    () => getRecordEventsPageBySchool(schoolId, filters, effectivePage, PAGE_SIZE),
    { keepPreviousData: true },
  );
  const events = data?.events ?? null;
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const hasActiveFilters = search.trim() !== "" || category !== ALL_VALUE || fromDate !== "" || toDate !== "";

  async function handleExport() {
    setIsExporting(true);
    try {
      const all = await getAllRecordEventsBySchool(schoolId, filters);
      const rows: string[][] = [
        ["Date & Time (ISO)", "Date", "Time", "Event", "Category", "Student", "Register Number", "Receipt Code", "What happened", "Done By", "Done By Role", "Entity", "Entity ID"],
      ];
      all.forEach((e) => {
        const at = new Date(e.createdAt);
        rows.push([
          e.createdAt,
          at.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
          at.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          eventLabel(e.eventType),
          categoryOfEvent(e.eventType),
          e.studentName,
          e.registerNumber ?? "",
          e.receiptCode ?? "",
          e.summary,
          e.actorName ?? "",
          e.actorType,
          e.entityType,
          e.entityId ?? "",
        ]);
      });
      downloadCsv(`records-history-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Records &amp; History</h1>
          <p className="text-sm text-sub">
            The school&apos;s permanent activity log — every order, receipt, collection, exchange, subject change and support
            query, with the exact date and time and who handled it. Search a student, a register number or a receipt code.
          </p>
        </div>
        <Button variant="outline" className="gap-2" disabled={!totalCount || isExporting} onClick={handleExport}>
          {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Export CSV
        </Button>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-section-essentials/30 bg-section-essentials-bg p-3 text-sm text-ink">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-section-essentials" />
        <p>
          This log is append-only: entries can&apos;t be edited or deleted, and orders, receipts and requests are protected from
          deletion. Events from before this log existed were added with their original dates.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1 space-y-1.5">
              <Label htmlFor="records-search" className="text-xs text-sub">
                Search
              </Label>
              <Input
                id="records-search"
                placeholder="Student name, register number, receipt code, item or staff name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-52 space-y-1.5">
              <Label className="text-xs text-sub">Type</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>Everything</SelectItem>
                  {RECORD_EVENT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40 space-y-1.5">
              <Label htmlFor="records-from" className="text-xs text-sub">
                From
              </Label>
              <Input id="records-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="w-40 space-y-1.5">
              <Label htmlFor="records-to" className="text-xs text-sub">
                To
              </Label>
              <Input id="records-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            {hasActiveFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setCategory(ALL_VALUE);
                  setFromDate("");
                  setToDate("");
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>

          {events !== null ? (
            <p className="text-sm text-sub">
              {totalCount === 0
                ? "0 entries"
                : `${(effectivePage - 1) * PAGE_SIZE + 1}–${Math.min(effectivePage * PAGE_SIZE, totalCount)} of ${totalCount} entries`}
            </p>
          ) : null}

          {events === null ? (
            <ConsoleListSkeleton />
          ) : events.length === 0 ? (
            <p className="rounded-xl border border-line/60 py-10 text-center text-sm text-sub">
              {hasActiveFilters ? "Nothing matches these filters." : "No activity recorded yet."}
            </p>
          ) : (
            <ul className={cn("space-y-2 transition-opacity", isValidating && "opacity-60")}>
              {events.map((event) => (
                <RecordEventRow key={event.id} event={event} />
              ))}
            </ul>
          )}

          {events !== null && totalPages > 1 ? (
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
