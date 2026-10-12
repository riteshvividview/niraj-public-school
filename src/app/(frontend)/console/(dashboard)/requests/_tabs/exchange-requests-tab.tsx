"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { ConsoleListSkeleton } from "@/components/shared/console-list-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getAllExchangeRequestsBySchool,
  getExchangeRequestsPageBySchool,
  type ExchangePageFilters,
} from "@/lib/data-source";
import { downloadCsv } from "@/lib/export-utils";
import { formatDate } from "@/lib/format";
import { useClassLevels, useConsoleSchoolId, useEssentialsStock } from "@/lib/hooks/console-data";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { ExchangeRequestRecord, ExchangeStatus } from "@/types";
import {
  ExchangeDetailSheet,
  formatDifference,
  REASON_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
} from "../../exchange-requests/_components/exchange-detail-sheet";

const ALL_VALUE = "__all__";
const PAGE_SIZE = 20;

type StatusFilter = ExchangeStatus | "open" | typeof ALL_VALUE;
const STATUS_TABS: Array<{ value: StatusFilter; label: string }> = [
  { value: "open", label: "Needs action" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: ALL_VALUE, label: "All" },
];

export function ExchangeRequestsTab() {
  const schoolId = useConsoleSchoolId();
  const { classLevels } = useClassLevels(schoolId);
  const { stockRows } = useEssentialsStock(schoolId);
  const [status, setStatus] = useState<StatusFilter>("open");
  const [search, setSearch] = useState("");
  const [classLevelId, setClassLevelId] = useState(ALL_VALUE);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const filters: ExchangePageFilters = {
    status: status !== ALL_VALUE ? status : undefined,
    search: debouncedSearch.trim() || undefined,
    classLevelId: classLevelId !== ALL_VALUE ? classLevelId : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };

  // Back to page 1 whenever the query changes (in-render adjustment, same pattern as Payments).
  const filtersKey = JSON.stringify(filters);
  const [seenFiltersKey, setSeenFiltersKey] = useState(filtersKey);
  if (filtersKey !== seenFiltersKey) {
    setSeenFiltersKey(filtersKey);
    setPage(1);
  }
  const effectivePage = filtersKey === seenFiltersKey ? page : 1;

  const swrKey = schoolId ? ["console:exchange-requests", schoolId, filtersKey, effectivePage] : null;
  const { data, isValidating, mutate } = useSWR(
    swrKey,
    () => getExchangeRequestsPageBySchool(schoolId, filters, effectivePage, PAGE_SIZE),
    { keepPreviousData: true, refreshInterval: 60_000 },
  );
  const records = data?.records ?? null;
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const classLabelById = new Map(classLevels.map((level) => [level.id, level.label]));
  const selected = records?.find((r) => r.id === selectedId) ?? null;

  function refresh() {
    void mutate();
    void globalMutate(["console:exchange-pending", schoolId]);
  }

  const hasActiveFilters = search.trim() !== "" || classLevelId !== ALL_VALUE || fromDate !== "" || toDate !== "";

  async function handleExport() {
    setIsExporting(true);
    try {
      const all = await getAllExchangeRequestsBySchool(schoolId, filters);
      const rows: string[][] = [
        [
          "Requested Date",
          "Status",
          "Student",
          "Register Number",
          "Class",
          "Section",
          "Phone",
          "Email",
          "Receipt Code",
          "Item",
          "From Size",
          "To Size",
          "Quantity",
          "Price Difference",
          "Reason",
          "Parent Note",
          "Staff Note",
          "Decided By",
          "Decided Date",
          "Completed By",
          "Completed Date",
          "Returned To Stock",
        ],
      ];
      all.forEach((r) =>
        rows.push([
          formatDate(r.createdAt),
          STATUS_LABELS[r.status],
          r.student.name,
          r.student.registerNumber,
          classLabelById.get(r.student.classLevelId) ?? "",
          r.student.section ?? "",
          r.student.mobileNumber ?? "",
          r.student.email ?? "",
          r.receiptCode,
          r.itemLabel,
          r.fromSize,
          r.toSize,
          String(r.quantity),
          String(r.priceDifference),
          REASON_LABELS[r.reason],
          r.note ?? "",
          r.staffNote ?? "",
          r.decidedByName ?? "",
          r.decidedAt ? formatDate(r.decidedAt) : "",
          r.completedByName ?? "",
          r.completedAt ? formatDate(r.completedAt) : "",
          r.returnedToStock === undefined ? "" : r.returnedToStock ? "Yes" : "No",
        ]),
      );
      downloadCsv(`exchange-requests-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-ink">Exchange Requests</h2>
          <p className="text-sm text-sub">
            Uniform size-exchange requests from parents. Approve or reject, then mark completed once the swap is done at the counter.
          </p>
        </div>
        <Button variant="outline" className="gap-2" disabled={!totalCount || isExporting} onClick={handleExport}>
          {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Export CSV
        </Button>
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

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1 space-y-1.5">
              <Label htmlFor="exchange-search" className="text-xs text-sub">
                Search
              </Label>
              <Input
                id="exchange-search"
                placeholder="Student, register number, receipt code or item"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-36 space-y-1.5">
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
            <div className="w-40 space-y-1.5">
              <Label htmlFor="exchange-from" className="text-xs text-sub">
                From
              </Label>
              <Input id="exchange-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="w-40 space-y-1.5">
              <Label htmlFor="exchange-to" className="text-xs text-sub">
                To
              </Label>
              <Input id="exchange-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            {hasActiveFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setClassLevelId(ALL_VALUE);
                  setFromDate("");
                  setToDate("");
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>

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
              {status === "open" && !hasActiveFilters
                ? "Nothing needs action right now."
                : "No exchange requests match these filters."}
            </p>
          ) : (
            <div className={cn("space-y-2 transition-opacity", isValidating && "opacity-60")}>
              {records.map((record: ExchangeRequestRecord) => (
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
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink">
                    <span className="font-medium">{record.itemLabel}</span>
                    <span className="flex items-center gap-1 text-sub">
                      {record.fromSize} <ArrowRight className="size-3" /> <span className="font-semibold text-ink">{record.toSize}</span>
                    </span>
                    <span className="text-sub">· qty {record.quantity}</span>
                  </div>
                  <p className="mt-1 text-xs text-sub">
                    {REASON_LABELS[record.reason]} · {formatDifference(record.priceDifference)} · Requested{" "}
                    {formatDate(record.createdAt)}
                  </p>
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

      <ExchangeDetailSheet
        record={selected}
        classLabel={selected ? (classLabelById.get(selected.student.classLevelId) ?? "—") : ""}
        stockRows={stockRows}
        onClose={() => setSelectedId(null)}
        onChanged={refresh}
      />
    </div>
  );
}
