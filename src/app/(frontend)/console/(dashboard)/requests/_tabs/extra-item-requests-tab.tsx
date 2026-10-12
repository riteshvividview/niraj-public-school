"use client";

import { Check, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate as globalMutate } from "swr";
import { ConsoleListSkeleton } from "@/components/shared/console-list-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { decideExtraItemRequest, getExtraItemRequestsPageBySchool, type ExtraItemFilters } from "@/lib/data-source";
import { formatDate, formatTime } from "@/lib/format";
import { useClassLevels, useConsoleSchoolId, useEssentialsStock } from "@/lib/hooks/console-data";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { ExtraItemRequestRecord, ExtraItemStatus } from "@/types";

const PAGE_SIZE = 20;
type Tab = ExtraItemStatus | "open" | "all";
const TABS: Array<{ value: Tab; label: string }> = [
  { value: "open", label: "Needs a decision" },
  { value: "approved", label: "Approved" },
  { value: "used", label: "Bought" },
  { value: "rejected", label: "Declined" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];
const STATUS_LABELS: Record<ExtraItemStatus, string> = {
  pending: "Needs a decision",
  approved: "Approved — parent can pay",
  used: "Bought",
  rejected: "Declined",
  cancelled: "Cancelled",
};
const STATUS_STYLES: Record<ExtraItemStatus, string> = {
  pending: "bg-section-programs-bg text-section-programs",
  approved: "bg-section-workspace-bg text-section-workspace",
  used: "bg-section-essentials-bg text-section-essentials",
  rejected: "bg-section-pay-bg text-section-pay",
  cancelled: "bg-muted text-sub",
};

/**
 * New-admission students who already bought their full set may only buy a single extra item
 * after the school confirms it is in stock. Approve = the parent can now pay for exactly that
 * item and size online; Decline = they can't.
 */
export function ExtraItemRequestsTab() {
  const schoolId = useConsoleSchoolId();
  const { classLevels } = useClassLevels(schoolId);
  const { stockRows } = useEssentialsStock(schoolId);
  const [tab, setTab] = useState<Tab>("open");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const debouncedSearch = useDebouncedValue(search, 300);

  const filters: ExtraItemFilters = { status: tab === "all" ? undefined : tab, search: debouncedSearch.trim() || undefined };
  const filtersKey = JSON.stringify(filters);
  const [seenKey, setSeenKey] = useState(filtersKey);
  if (filtersKey !== seenKey) {
    setSeenKey(filtersKey);
    setPage(1);
  }
  const effectivePage = filtersKey === seenKey ? page : 1;

  const { data, mutate } = useSWR(
    schoolId ? ["console:extra-item-requests", schoolId, filtersKey, effectivePage] : null,
    () => getExtraItemRequestsPageBySchool(schoolId, filters, effectivePage, PAGE_SIZE),
    { keepPreviousData: true, refreshInterval: 45_000 },
  );
  const records = data?.records ?? null;
  const classLabelById = new Map(classLevels.map((c) => [c.id, c.label]));

  function stockFor(record: ExtraItemRequestRecord): string {
    const row = stockRows?.find((r) => r.kind === "uniform" && r.refId === record.uniformItemId && r.variantKey === record.size);
    if (!row) return "stock not tracked";
    return row.quantityOnHand > 0 ? `${row.quantityOnHand} in stock` : "OUT OF STOCK";
  }

  async function decide(record: ExtraItemRequestRecord, action: "approve" | "reject") {
    setBusyId(record.id);
    try {
      await decideExtraItemRequest(record.id, action, notes[record.id]);
      toast.success(action === "approve" ? "Approved — the parent can now pay for it." : "Declined.");
      await mutate();
      void globalMutate(["console:extra-pending", schoolId]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
      await mutate();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-semibold text-ink">Extra Item Requests</h2>
        <p className="mt-1 text-sm text-sub">
          After buying their full uniform set, a new-admission student can buy one more item only once you confirm it is in stock. Approve and the parent can pay for it online, then collect it with the receipt.
        </p>
      </div>
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Requests</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((item) => (
              <Button key={item.value} size="sm" variant={tab === item.value ? "default" : "outline"} onClick={() => setTab(item.value)}>
                {item.label}
              </Button>
            ))}
            <Input className="ml-auto w-full sm:w-64" placeholder="Search student or item" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {records === null ? (
            <ConsoleListSkeleton />
          ) : records.length === 0 ? (
            <p className="py-8 text-center text-sm text-sub">{tab === "open" ? "No requests waiting. 🎉" : "Nothing here."}</p>
          ) : (
            <ul className="divide-y divide-line">
              {records.map((record) => (
                <li key={record.id} className="space-y-2 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">
                        {record.itemLabel} <span className="font-normal text-sub">· size {record.size}</span>
                      </p>
                      <p className="text-sm text-sub">
                        {record.student.name} · {record.student.registerNumber} · {classLabelById.get(record.student.classLevelId) ?? ""}
                        {record.student.section ? ` - ${record.student.section}` : ""}
                        {record.student.mobileNumber ? ` · ${record.student.mobileNumber}` : ""}
                      </p>
                      <p className="text-xs text-sub">
                        Asked {formatDate(record.createdAt)} at {formatTime(record.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLES[record.status])}>{STATUS_LABELS[record.status]}</span>
                      <span className={cn("text-xs", stockFor(record) === "OUT OF STOCK" ? "font-semibold text-section-pay" : "text-sub")}>{stockFor(record)}</span>
                    </div>
                  </div>
                  {record.note ? <p className="text-sm text-ink">Parent&apos;s note: {record.note}</p> : null}
                  {record.staffNote ? <p className="text-sm text-sub">Your note: {record.staffNote}{record.handledByName ? ` — ${record.handledByName}` : ""}</p> : null}
                  {record.status === "pending" ? (
                    <div className="space-y-2">
                      <Textarea rows={1} maxLength={500} placeholder="Note to the parent (optional)" value={notes[record.id] ?? ""} onChange={(e) => setNotes((prev) => ({ ...prev, [record.id]: e.target.value }))} />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" disabled={busyId !== null} onClick={() => decide(record, "approve")}>
                          {busyId === record.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                          Approve — in stock
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyId !== null} onClick={() => decide(record, "reject")}>
                          <X className="size-4" /> Decline
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {(data?.totalPages ?? 1) > 1 ? (
            <div className="flex items-center justify-between gap-3 pt-3">
              <Button variant="outline" size="sm" disabled={effectivePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="size-4" /> Previous
              </Button>
              <p className="text-xs text-sub">
                Page {effectivePage} of {data?.totalPages ?? 1}
              </p>
              <Button variant="outline" size="sm" disabled={effectivePage >= (data?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
