"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { ConsoleListSkeleton } from "@/components/shared/console-list-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { checkPaymentStatus, getPaymentAttemptsPageBySchool, getPaymentProviderInfo, type PaymentAttemptFilters } from "@/lib/data-source";
import { formatDate, formatTime } from "@/lib/format";
import { useClassLevels, useConsoleSchoolId } from "@/lib/hooks/console-data";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { PaymentAttemptStatus } from "@/types";

const PAGE_SIZE = 20;

type Tab = "review" | "pending" | "paid" | "ended" | "all";
const TABS: Array<{ value: Tab; label: string }> = [
  { value: "review", label: "Needs review" },
  { value: "pending", label: "In progress" },
  { value: "paid", label: "Paid" },
  { value: "ended", label: "Failed / cancelled / timed out" },
  { value: "all", label: "All" },
];

const STATUS_LABELS: Record<PaymentAttemptStatus, string> = {
  pending: "In progress",
  paid: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
  expired: "Timed out",
};
const STATUS_STYLES: Record<PaymentAttemptStatus, string> = {
  pending: "bg-section-programs-bg text-section-programs",
  paid: "bg-section-essentials-bg text-section-essentials",
  failed: "bg-section-pay-bg text-section-pay",
  cancelled: "bg-muted text-sub",
  expired: "bg-muted text-sub",
};

/**
 * Every try at paying — including the ones that never became an order. A payment is
 * recorded here the moment a parent starts, so staff can answer "did my payment go
 * through?" by looking at the real status, and can re-check any attempt with the
 * payment provider. "Needs review" lists anything that may be a double payment.
 */
export function PaymentAttemptsTab() {
  const schoolId = useConsoleSchoolId();
  const { classLevels } = useClassLevels(schoolId);
  const [tab, setTab] = useState<Tab>("review");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const filters: PaymentAttemptFilters = {
    status: tab === "pending" ? "pending" : tab === "paid" ? "paid" : tab === "ended" ? "ended" : undefined,
    needsReview: tab === "review" ? true : undefined,
    search: debouncedSearch.trim() || undefined,
  };
  const filtersKey = JSON.stringify(filters);
  const [seenKey, setSeenKey] = useState(filtersKey);
  if (filtersKey !== seenKey) {
    setSeenKey(filtersKey);
    setPage(1);
  }
  const effectivePage = filtersKey === seenKey ? page : 1;

  const { data, mutate } = useSWR(
    schoolId ? ["console:payment-attempts", schoolId, filtersKey, effectivePage] : null,
    () => getPaymentAttemptsPageBySchool(schoolId, filters, effectivePage, PAGE_SIZE),
    { keepPreviousData: true, refreshInterval: 30_000 },
  );
  const { data: provider } = useSWR("console:payment-provider", () => getPaymentProviderInfo());
  const records = data?.records ?? null;
  const classLabelById = new Map(classLevels.map((level) => [level.id, level.label]));

  async function recheck(id: string) {
    setCheckingId(id);
    try {
      const updated = await checkPaymentStatus(id);
      toast.success(`Checked with the payment provider — now "${STATUS_LABELS[updated.status]}".`);
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not check the payment.");
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-semibold text-ink">Payment Attempts</h2>
        <p className="mt-1 text-sm text-sub">
          Every payment a parent started, with its real status — including ones that never became an order. Receipts and orders are in{" "}
          <strong className="text-ink">Payments</strong>.
        </p>
      </div>

      {provider?.testMode ? (
        <div className="rounded-lg border border-section-programs/30 bg-section-programs-bg p-3 text-sm text-section-programs">
          Test mode — no real payment provider is connected, so no real money is moving. See Administration → Payments.
        </div>
      ) : null}

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Attempts</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((item) => (
              <Button key={item.value} size="sm" variant={tab === item.value ? "default" : "outline"} onClick={() => setTab(item.value)}>
                {item.label}
              </Button>
            ))}
            <Input className="ml-auto w-full sm:w-64" placeholder="Search student name or register no." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {records === null ? (
            <ConsoleListSkeleton />
          ) : records.length === 0 ? (
            <p className="py-8 text-center text-sm text-sub">{tab === "review" ? "Nothing needs review. 🎉" : "No payment attempts here."}</p>
          ) : (
            <ul className="divide-y divide-line">
              {records.map((record) => (
                <li key={record.id} className="space-y-2 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">
                        {record.student.name}
                        <span className="font-normal text-sub">
                          {" "}
                          · {record.student.registerNumber} · {classLabelById.get(record.student.classLevelId) ?? ""}
                          {record.student.section ? ` - ${record.student.section}` : ""}
                        </span>
                      </p>
                      <p className="text-xs text-sub">
                        {formatDate(record.createdAt)} at {formatTime(record.createdAt)} · {record.provider === "simulated" ? "test" : record.provider}
                        {record.method ? ` · ${record.method.toUpperCase()}` : ""}
                        {record.providerPaymentId ? ` · ref ${record.providerPaymentId}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-ink">₹{record.amount.toLocaleString("en-IN")}</span>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLES[record.status])}>{STATUS_LABELS[record.status]}</span>
                    </div>
                  </div>
                  <p className="text-sm text-ink">{record.items.map((item) => item.label).join(", ")}</p>
                  {record.failureReason ? <p className="text-xs text-section-pay">{record.failureReason}</p> : null}
                  {record.needsReview ? (
                    <div className="flex items-start gap-2 rounded-lg border border-section-pay/30 bg-section-pay-bg p-2.5 text-sm text-section-pay">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <span>{record.reviewNote ?? "Please review this payment."}</span>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    {record.status !== "paid" ? (
                      <Button size="sm" variant="outline" disabled={checkingId !== null} onClick={() => recheck(record.id)}>
                        {checkingId === record.id ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                        Re-check with provider
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {(data?.totalPages ?? 1) > 1 ? (
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button variant="outline" size="sm" disabled={effectivePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="size-4" /> Previous
              </Button>
              <p className="text-xs text-sub">
                Page {effectivePage} of {data?.totalPages ?? 1} · {data?.totalCount ?? 0} attempts
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
