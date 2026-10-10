"use client";

import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR, { preload } from "swr";
import { ConsoleListSkeleton } from "@/components/shared/console-list-skeleton";
import { PaymentCard } from "@/components/console/payment-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deriveReceiptTitle } from "@/lib/cart-items";
import { getPaymentsPageBySchool, getStudentSectionsBySchool, type PaymentPageFilters } from "@/lib/data-source";
import { formatAddress } from "@/lib/address";
import { downloadCsv } from "@/lib/export-utils";
import { formatDate, formatTime } from "@/lib/format";
import { useClassLevels, useConsoleSchoolId } from "@/lib/hooks/console-data";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { Order, RedemptionStatus } from "@/types";

const RECEIPT_TITLE_LABELS = {
  books: "Books",
  uniform: "Uniform",
  receiptWord: "Receipt",
  programmeReceiptWord: "Programme Receipt",
};

const ALL_VALUE = "__all__";

interface PaymentFilters {
  search: string;
  classLevelId: string;
  section: string;
  redemptionStatus: string;
  paymentMethod: string;
  fromDate: string;
  toDate: string;
}

const EMPTY_FILTERS: PaymentFilters = {
  search: "",
  classLevelId: ALL_VALUE,
  section: ALL_VALUE,
  redemptionStatus: ALL_VALUE,
  paymentMethod: ALL_VALUE,
  fromDate: "",
  toDate: "",
};

const PAGE_SIZE = 20;

export default function PaymentsPage() {
  const schoolId = useConsoleSchoolId();
  const { classLevels } = useClassLevels(schoolId);
  const { data: sections = [] } = useSWR(schoolId ? ["console:student-sections", schoolId] : null, () =>
    getStudentSectionsBySchool(schoolId),
  );
  const [filters, setFilters] = useState<PaymentFilters>(EMPTY_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const queryFilters: PaymentPageFilters = {
    search: debouncedSearch.trim() || undefined,
    classLevelId: filters.classLevelId !== ALL_VALUE ? filters.classLevelId : undefined,
    section: filters.section !== ALL_VALUE ? filters.section : undefined,
    redemptionStatus: filters.redemptionStatus !== ALL_VALUE ? (filters.redemptionStatus as RedemptionStatus) : undefined,
    paymentMethod: filters.paymentMethod !== ALL_VALUE ? (filters.paymentMethod as Order["paymentMethod"]) : undefined,
    fromDate: filters.fromDate || undefined,
    toDate: filters.toDate || undefined,
  };

  // Reset to page 1 whenever the effective query changes — an in-render
  // state adjustment (not an effect) so it can't fire an extra render cycle.
  const filtersKey = JSON.stringify(queryFilters);
  const [seenFiltersKey, setSeenFiltersKey] = useState(filtersKey);
  if (filtersKey !== seenFiltersKey) {
    setSeenFiltersKey(filtersKey);
    setPage(1);
  }
  const effectivePage = filtersKey === seenFiltersKey ? page : 1;

  const { data: pageData, isValidating: paymentsValidating } = useSWR(
    schoolId ? ["console:payments", schoolId, filtersKey, effectivePage] : null,
    () => getPaymentsPageBySchool(schoolId, queryFilters, effectivePage, PAGE_SIZE),
    { keepPreviousData: true },
  );
  const records = pageData?.records ?? null;
  const totalCount = pageData?.totalCount ?? 0;
  const totalPages = pageData?.totalPages ?? 1;

  // Warm the cache for the next page in the background so hitting "Next"
  // usually shows data immediately instead of waiting on a fresh request.
  useEffect(() => {
    if (!schoolId || !pageData || effectivePage >= pageData.totalPages) return;
    const nextPage = effectivePage + 1;
    preload(["console:payments", schoolId, filtersKey, nextPage], () =>
      getPaymentsPageBySchool(schoolId, queryFilters, nextPage, PAGE_SIZE),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, filtersKey, effectivePage, pageData?.totalPages]);

  const classLabelById = new Map(classLevels.map((level) => [level.id, level.label]));

  function set<K extends keyof PaymentFilters>(key: K, value: PaymentFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.classLevelId !== ALL_VALUE ||
    filters.section !== ALL_VALUE ||
    filters.redemptionStatus !== ALL_VALUE ||
    filters.paymentMethod !== ALL_VALUE ||
    filters.fromDate !== "" ||
    filters.toDate !== "";

  /** Exports every record matching the current filters, not just the visible page — a separate on-demand fetch, since the visible list is paginated. */
  async function handleExport() {
    setIsExporting(true);
    try {
      const { records: allRecords } = await getPaymentsPageBySchool(schoolId, queryFilters, 1, 5000);
      const rows: string[][] = [
        [
          "Receipt Code",
          "Receipt Title",
          "Student Name",
          "Register Number",
          "Class",
          "Section",
          "Item Name",
          "Item Kind",
          "Item Meta",
          "Quantity",
          "Unit Price",
          "Line Total",
          "Order Total",
          "Payment Method",
          "Order Status",
          "Redemption Status",
          "Issued Date",
          "Issued Time",
          "Redeemed Date",
          "Redeemed Time",
          "Order ID",
          "Receipt ID",
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
            item.meta ?? "",
            String(item.quantity),
            String(item.unitPrice),
            String(item.unitPrice * item.quantity),
            String(record.order.totalAmount),
            record.order.paymentMethod,
            record.order.status,
            record.receipt.redemptionStatus,
            formatDate(record.receipt.issuedAt),
            formatTime(record.receipt.issuedAt),
            record.receipt.redeemedAt ? formatDate(record.receipt.redeemedAt) : "",
            record.receipt.redeemedAt ? formatTime(record.receipt.redeemedAt) : "",
            record.order.id,
            record.receipt.id,
            formatAddress(record.address),
            record.address?.phone ?? record.studentPhone ?? "",
          ]);
        });
      });
      const suffix =
        filters.fromDate || filters.toDate ? `-${filters.fromDate || "start"}-to-${filters.toDate || "now"}` : "";
      downloadCsv(`payments${suffix}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Payments</h1>
          <p className="text-sm text-sub">
            Every receipt issued at this school — who paid, what for, and its
            collection / check-in status.
          </p>
        </div>
        <Button variant="outline" className="gap-2" disabled={!totalCount || isExporting} onClick={handleExport}>
          {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1 space-y-1.5">
              <Label htmlFor="payment-search" className="text-xs text-sub">
                Search
              </Label>
              <Input
                id="payment-search"
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
              <Label className="text-xs text-sub">Redemption</Label>
              <Select value={filters.redemptionStatus} onValueChange={(v) => set("redemptionStatus", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="partially-collected">Partially Collected</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="checked-in">Checked In</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-36 space-y-1.5">
              <Label className="text-xs text-sub">Method</Label>
              <Select value={filters.paymentMethod} onValueChange={(v) => set("paymentMethod", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="netbanking">Net Banking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-40 space-y-1.5">
              <Label htmlFor="payment-from" className="text-xs text-sub">
                From
              </Label>
              <Input
                id="payment-from"
                type="date"
                value={filters.fromDate}
                onChange={(e) => set("fromDate", e.target.value)}
              />
            </div>
            <div className="w-40 space-y-1.5">
              <Label htmlFor="payment-to" className="text-xs text-sub">
                To
              </Label>
              <Input
                id="payment-to"
                type="date"
                value={filters.toDate}
                onChange={(e) => set("toDate", e.target.value)}
              />
            </div>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
                Clear filters
              </Button>
            ) : null}
          </div>

          {records !== null ? (
            <p className="text-sm text-sub">
              {totalCount === 0
                ? "0 payments"
                : `${(effectivePage - 1) * PAGE_SIZE + 1}–${Math.min(effectivePage * PAGE_SIZE, totalCount)} of ${totalCount} payments`}
            </p>
          ) : null}

          {records === null ? (
            <ConsoleListSkeleton />
          ) : records.length === 0 ? (
            <p className="rounded-xl border border-line/60 py-10 text-center text-sm text-sub">
              {!hasActiveFilters ? "No payments recorded yet." : "No payments match these filters."}
            </p>
          ) : (
            <div
              className={`space-y-2 transition-opacity ${paymentsValidating ? "opacity-60" : ""}`}
            >
              {records.map((record) => (
                <PaymentCard
                  key={record.receipt.id}
                  record={record}
                  classLabel={classLabelById.get(record.classLevelId) ?? "—"}
                />
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
