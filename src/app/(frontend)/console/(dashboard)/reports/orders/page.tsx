"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import useSWR, { preload } from "swr";
import { PaymentCard } from "@/components/console/payment-card";
import { ConsoleListSkeleton, ConsoleStatSkeleton } from "@/components/shared/console-list-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPaymentsPageBySchool, getStudentSectionsBySchool, type PaymentPageFilters } from "@/lib/data-source";
import { formatAddress } from "@/lib/address";
import { downloadCsv } from "@/lib/export-utils";
import { collectionStatusOf, overviewOf } from "@/lib/reports-aggregate";
import { deriveReceiptTitle } from "@/lib/cart-items";
import { formatCurrencyINR } from "@/lib/format";
import { useClassLevels, useConsoleSchoolId } from "@/lib/hooks/console-data";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

const ALL_VALUE = "__all__";
const PAGE_SIZE = 20;
const CATEGORY_LABELS = { books: "Books", uniform: "Uniform & Kit", programs: "Programs & Events" } as const;

const RECEIPT_TITLE_LABELS = {
  books: "Books",
  uniform: "Uniform",
  receiptWord: "Receipt",
  programmeReceiptWord: "Programme Receipt",
};

interface OrdersFilters {
  search: string;
  classLevelId: string;
  section: string;
  status: string;
  fromDate: string;
  toDate: string;
}

function OrdersDrillDown() {
  const params = useSearchParams();
  const schoolId = useConsoleSchoolId();
  const { classLevels } = useClassLevels(schoolId);
  const { data: sections = [] } = useSWR(schoolId ? ["console:student-sections", schoolId] : null, () =>
    getStudentSectionsBySchool(schoolId),
  );

  const [filters, setFilters] = useState<OrdersFilters>(() => ({
    search: "",
    classLevelId: params.get("classLevelId") ?? ALL_VALUE,
    section: params.get("section") ?? ALL_VALUE,
    status: params.get("status") ?? ALL_VALUE,
    fromDate: params.get("fromDate") ?? "",
    toDate: params.get("toDate") ?? "",
  }));
  const sortOldest = params.get("sort") === "oldest";
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const queryFilters: PaymentPageFilters = {
    search: debouncedSearch.trim() || undefined,
    classLevelId: filters.classLevelId !== ALL_VALUE ? filters.classLevelId : undefined,
    section: filters.section !== ALL_VALUE ? filters.section : undefined,
    collectionState: filters.status === "collected" || filters.status === "pending" ? filters.status : undefined,
    redemptionStatus: filters.status === "partial" ? "partially-collected" : undefined,
    fromDate: filters.fromDate || undefined,
    toDate: filters.toDate || undefined,
  };
  const filtersKey = JSON.stringify(queryFilters);
  const [seenFiltersKey, setSeenFiltersKey] = useState(filtersKey);
  if (filtersKey !== seenFiltersKey) {
    setSeenFiltersKey(filtersKey);
    setPage(1);
  }
  const effectivePage = filtersKey === seenFiltersKey ? page : 1;
  const sort = sortOldest ? "issuedAt" : "-issuedAt";

  const { data: pageData, isValidating } = useSWR(
    schoolId ? ["console:reports:orders", schoolId, filtersKey, effectivePage, sort] : null,
    () => getPaymentsPageBySchool(schoolId, queryFilters, effectivePage, PAGE_SIZE, sort),
    { keepPreviousData: true },
  );
  const records = pageData?.records ?? null;
  const totalCount = pageData?.totalCount ?? 0;
  const totalPages = pageData?.totalPages ?? 1;

  useEffect(() => {
    if (!schoolId || !pageData || effectivePage >= pageData.totalPages) return;
    const nextPage = effectivePage + 1;
    preload(["console:reports:orders", schoolId, filtersKey, nextPage, sort], () =>
      getPaymentsPageBySchool(schoolId, queryFilters, nextPage, PAGE_SIZE, sort),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, filtersKey, effectivePage, sort, pageData?.totalPages]);

  // A full (unpaginated, capped) fetch just for the summary strip — same
  // filter, independent of the paginated list above.
  const { data: summaryPage } = useSWR(
    schoolId ? ["console:reports:orders:summary", schoolId, filtersKey] : null,
    () => getPaymentsPageBySchool(schoolId, queryFilters, 1, 5000),
  );
  const summary = summaryPage ? overviewOf(summaryPage.records) : null;
  const categoryBreakdown = summaryPage ? collectionStatusOf(summaryPage.records) : null;

  const classLabelById = new Map(classLevels.map((level) => [level.id, level.label]));

  function set<K extends keyof OrdersFilters>(key: K, value: OrdersFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.classLevelId !== ALL_VALUE ||
    filters.section !== ALL_VALUE ||
    filters.status !== ALL_VALUE ||
    filters.fromDate !== "" ||
    filters.toDate !== "";

  async function handleExport() {
    setIsExporting(true);
    try {
      const { records: allRecords } = await getPaymentsPageBySchool(schoolId, queryFilters, 1, 5000, sort);
      const rows: (string | number)[][] = [
        [
          "Receipt Code",
          "Receipt Title",
          "Student Name",
          "Register Number",
          "Class",
          "Section",
          "Item Name",
          "Item Kind",
          "Quantity",
          "Unit Price",
          "Line Total",
          "Order Total",
          "Payment Method",
          "Redemption Status",
          "Issued Date",
          "Delivery Address",
          "Delivery Phone",
        ],
      ];
      allRecords.forEach((record) => {
        const title = deriveReceiptTitle(record.order.items, RECEIPT_TITLE_LABELS);
        const classLabel = classLabelById.get(record.classLevelId) ?? "";
        record.order.items.forEach((item) => {
          rows.push([
            record.receipt.qrPayload,
            title,
            record.studentName,
            record.registerNumber,
            classLabel,
            record.section ?? "",
            item.label,
            item.kind,
            item.quantity,
            item.unitPrice,
            item.unitPrice * item.quantity,
            record.order.totalAmount,
            record.order.paymentMethod,
            record.receipt.redemptionStatus,
            record.receipt.issuedAt.slice(0, 10),
            formatAddress(record.address),
            record.address?.phone ?? record.studentPhone ?? "",
          ]);
        });
      });
      downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/console/reports"
        className="inline-flex items-center gap-1.5 text-sm text-sub transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Back to Reports
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Orders</h1>
          <p className="text-sm text-sub">Every order matching the current filter, with revenue and collection detail.</p>
        </div>
        <Button variant="outline" className="gap-2" disabled={!totalCount || isExporting} onClick={handleExport}>
          {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Export CSV
        </Button>
      </div>

      {!summary || !categoryBreakdown ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <ConsoleStatSkeleton />
          <ConsoleStatSkeleton />
          <ConsoleStatSkeleton />
          <ConsoleStatSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="text-xs text-sub">Orders</p>
            <p className="font-heading text-2xl font-bold text-ink">{summary.ordersCount}</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="text-xs text-sub">Total revenue</p>
            <p className="font-heading text-2xl font-bold text-ink">{formatCurrencyINR(summary.revenue)}</p>
          </div>
          {(["books", "uniform", "programs"] as const).map((category) => {
            const row = categoryBreakdown.find((r) => r.category === category);
            const amount = (row?.collectedValue ?? 0) + (row?.pendingValue ?? 0);
            return (
              <div key={category} className="rounded-2xl border border-line bg-card p-4">
                <p className="text-xs text-sub">{CATEGORY_LABELS[category]}</p>
                <p className="font-heading text-2xl font-bold text-ink">{formatCurrencyINR(amount)}</p>
              </div>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1 space-y-1.5">
              <Label htmlFor="orders-search" className="text-xs text-sub">
                Search
              </Label>
              <Input
                id="orders-search"
                placeholder="Student, register number, or receipt code"
                value={filters.search}
                onChange={(e) => set("search", e.target.value)}
              />
            </div>
            <div className="w-36 space-y-1.5">
              <Label className="text-xs text-sub">Class</Label>
              <Select value={filters.classLevelId} onValueChange={(v) => set("classLevelId", v)}>
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
            <div className="w-36 space-y-1.5">
              <Label className="text-xs text-sub">Section</Label>
              <Select value={filters.section} onValueChange={(v) => set("section", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All Sections</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section} value={section}>
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40 space-y-1.5">
              <Label className="text-xs text-sub">Status</Label>
              <Select value={filters.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="partial">Partially Collected</SelectItem>
                  <SelectItem value="pending">Awaiting collection</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-40 space-y-1.5">
              <Label htmlFor="orders-from" className="text-xs text-sub">
                From
              </Label>
              <Input id="orders-from" type="date" value={filters.fromDate} onChange={(e) => set("fromDate", e.target.value)} />
            </div>
            <div className="w-40 space-y-1.5">
              <Label htmlFor="orders-to" className="text-xs text-sub">
                To
              </Label>
              <Input id="orders-to" type="date" value={filters.toDate} onChange={(e) => set("toDate", e.target.value)} />
            </div>
            {hasActiveFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters({ search: "", classLevelId: ALL_VALUE, section: ALL_VALUE, status: ALL_VALUE, fromDate: "", toDate: "" })
                }
              >
                Clear filters
              </Button>
            ) : null}
          </div>

          {records !== null ? (
            <p className="text-sm text-sub">
              {totalCount === 0
                ? "0 orders"
                : `${(effectivePage - 1) * PAGE_SIZE + 1}–${Math.min(effectivePage * PAGE_SIZE, totalCount)} of ${totalCount} orders${sortOldest ? " · oldest first" : ""}`}
            </p>
          ) : null}

          {records === null ? (
            <ConsoleListSkeleton />
          ) : records.length === 0 ? (
            <p className="rounded-xl border border-line/60 py-10 text-center text-sm text-sub">
              {!hasActiveFilters ? "No orders recorded yet." : "No orders match these filters."}
            </p>
          ) : (
            <div className={`space-y-2 transition-opacity ${isValidating ? "opacity-60" : ""}`}>
              {records.map((record) => (
                <PaymentCard key={record.receipt.id} record={record} classLabel={classLabelById.get(record.classLevelId) ?? "—"} />
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
    </div>
  );
}

export default function OrdersDrillDownPage() {
  return (
    <Suspense fallback={null}>
      <OrdersDrillDown />
    </Suspense>
  );
}
