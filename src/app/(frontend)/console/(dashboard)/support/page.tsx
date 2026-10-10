"use client";

import { ChevronLeft, ChevronRight, Download, Loader2, Mail, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { ConsoleListSkeleton } from "@/components/shared/console-list-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllSupportRequestsBySchool, getSupportRequestsPageBySchool, type SupportPageFilters } from "@/lib/data-source";
import { mailtoLink, telLink, whatsAppLink } from "@/lib/contact-links";
import { downloadCsv } from "@/lib/export-utils";
import { formatDate, formatTime } from "@/lib/format";
import { useClassLevels, useConsoleSchoolId } from "@/lib/hooks/console-data";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { SupportStatus } from "@/types";
import { STATUS_LABELS, STATUS_STYLES, SupportDetailSheet } from "./_components/support-detail-sheet";

const ALL_VALUE = "__all__";
const PAGE_SIZE = 20;

type StatusFilter = SupportStatus | "unresolved" | typeof ALL_VALUE;
const STATUS_TABS: Array<{ value: StatusFilter; label: string }> = [
  { value: "unresolved", label: "Needs action" },
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: ALL_VALUE, label: "All" },
];

export default function ParentSupportPage() {
  const schoolId = useConsoleSchoolId();
  const { classLevels } = useClassLevels(schoolId);
  const [status, setStatus] = useState<StatusFilter>("unresolved");
  const [search, setSearch] = useState("");
  const [classLevelId, setClassLevelId] = useState(ALL_VALUE);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const filters: SupportPageFilters = {
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
    schoolId ? ["console:support", schoolId, filtersKey, effectivePage] : null,
    () => getSupportRequestsPageBySchool(schoolId, filters, effectivePage, PAGE_SIZE),
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
    void globalMutate(["console:support-open", schoolId]);
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const all = await getAllSupportRequestsBySchool(schoolId, filters);
      const rows: string[][] = [
        ["Sent Date", "Sent Time", "Status", "Student", "Register Number", "Class", "Section", "Contact Phone", "Contact Email", "Profile Phone", "Profile Email", "Message", "Staff Note", "Contact Log", "Handled By", "Handled Date", "Resolved Date"],
      ];
      all.forEach((r) =>
        rows.push([
          formatDate(r.createdAt),
          formatTime(r.createdAt),
          STATUS_LABELS[r.status],
          r.student.name,
          r.student.registerNumber,
          classLabelById.get(r.student.classLevelId) ?? "",
          r.student.section ?? "",
          r.contactPhone ?? "",
          r.contactEmail ?? "",
          r.student.mobileNumber ?? "",
          r.student.email ?? "",
          r.message,
          r.staffNote ?? "",
          r.contactNote ?? "",
          r.handledByName ?? "",
          r.handledAt ? formatDate(r.handledAt) : "",
          r.resolvedAt ? formatDate(r.resolvedAt) : "",
        ]),
      );
      downloadCsv(`parent-support-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Parent Support</h1>
          <p className="text-sm text-sub">
            Questions parents sent from the Support tab. Contact them directly — tap their phone or email to call, WhatsApp or write.
          </p>
        </div>
        <Button variant="outline" className="gap-2" disabled={!totalCount || isExporting} onClick={handleExport}>
          {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queries</CardTitle>
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
              <Label htmlFor="support-search" className="text-xs text-sub">
                Search
              </Label>
              <Input
                id="support-search"
                placeholder="Student, register number, phone or words in the message"
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
          </div>

          {records !== null ? (
            <p className="text-sm text-sub">
              {totalCount === 0
                ? "0 queries"
                : `${(effectivePage - 1) * PAGE_SIZE + 1}–${Math.min(effectivePage * PAGE_SIZE, totalCount)} of ${totalCount} queries`}
            </p>
          ) : null}

          {records === null ? (
            <ConsoleListSkeleton />
          ) : records.length === 0 ? (
            <p className="rounded-xl border border-line/60 py-10 text-center text-sm text-sub">
              {status === "unresolved" && !hasActiveFilters ? "No queries waiting — all caught up." : "No queries match these filters."}
            </p>
          ) : (
            <div className={cn("space-y-2 transition-opacity", isValidating && "opacity-60")}>
              {records.map((record) => {
                const phone = record.contactPhone ?? record.student.mobileNumber;
                const email = record.contactEmail ?? record.student.email;
                return (
                  <div key={record.id} className="rounded-xl border border-line/60 p-3.5 transition-colors hover:bg-muted/40">
                    <button type="button" onClick={() => setSelectedId(record.id)} className="block w-full cursor-pointer text-left">
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
                      <p className="mt-2 line-clamp-2 text-sm text-ink">{record.message}</p>
                      <p className="mt-1 text-xs text-sub">
                        {formatDate(record.createdAt)} · {formatTime(record.createdAt)}
                      </p>
                    </button>
                    {phone || email ? (
                      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line/60 pt-2">
                        {phone ? (
                          <>
                            <Button asChild size="sm" variant="outline" className="h-7 gap-1.5 px-2">
                              <a href={telLink(phone)}>
                                <Phone className="size-3.5" />
                                {phone}
                              </a>
                            </Button>
                            <Button asChild size="sm" variant="outline" className="h-7 gap-1.5 px-2">
                              <a href={whatsAppLink(phone)} target="_blank" rel="noreferrer">
                                <MessageCircle className="size-3.5" />
                                WhatsApp
                              </a>
                            </Button>
                          </>
                        ) : null}
                        {email ? (
                          <Button asChild size="sm" variant="outline" className="h-7 gap-1.5 px-2">
                            <a href={mailtoLink(email, "Regarding your query to the school")}>
                              <Mail className="size-3.5" />
                              {email}
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
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

      <SupportDetailSheet
        record={selected}
        classLabel={selected ? (classLabelById.get(selected.student.classLevelId) ?? "—") : ""}
        onClose={() => setSelectedId(null)}
        onChanged={refresh}
      />
    </div>
  );
}
