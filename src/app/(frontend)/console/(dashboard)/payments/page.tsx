"use client";

import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ConsoleListSkeleton } from "@/components/shared/console-list-skeleton";
import { StatusBadge, toBadgeStatus } from "@/components/shared/status-badge";
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
import { getClassLevelsBySchool, getPaymentsBySchool, getSchools } from "@/lib/data-source";
import { formatDate, formatTime } from "@/lib/format";
import type { ClassLevel, PaymentRecord } from "@/types";

const RECEIPT_TITLE_LABELS = {
  books: "Books",
  uniform: "Uniform",
  stationery: "Stationery",
  receiptWord: "Receipt",
  programmeReceiptWord: "Programme Receipt",
};

const ALL_VALUE = "__all__";

interface PaymentFilters {
  search: string;
  classLevelId: string;
  redemptionStatus: string;
  paymentMethod: string;
  fromDate: string;
  toDate: string;
}

const EMPTY_FILTERS: PaymentFilters = {
  search: "",
  classLevelId: ALL_VALUE,
  redemptionStatus: ALL_VALUE,
  paymentMethod: ALL_VALUE,
  fromDate: "",
  toDate: "",
};

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
}

function matchesDateRange(isoDate: string, fromDate: string, toDate: string): boolean {
  const day = isoDate.slice(0, 10);
  if (fromDate && day < fromDate) return false;
  if (toDate && day > toDate) return false;
  return true;
}

function PaymentCard({ record, classLabel }: { record: PaymentRecord; classLabel: string }) {
  const [expanded, setExpanded] = useState(false);
  const title = deriveReceiptTitle(record.order.items, RECEIPT_TITLE_LABELS);
  return (
    <div className="rounded-xl border border-line/60 p-3.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-wrap items-start justify-between gap-2 text-left"
      >
        <div className="min-w-0">
          <p className="font-medium text-ink">{title}</p>
          <p className="font-mono text-xs tracking-widest text-sub">{record.receipt.qrPayload}</p>
          <p className="mt-0.5 text-xs text-sub">
            {formatDate(record.receipt.issuedAt)} · {formatTime(record.receipt.issuedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink">₹{record.order.totalAmount}</span>
          <StatusBadge status={toBadgeStatus(record.receipt.redemptionStatus)} />
        </div>
      </button>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-sub">
        <span>{record.studentName}</span>
        <span>·</span>
        <span>{record.registerNumber}</span>
        <span>·</span>
        <span>{classLabel}</span>
        {record.section ? (
          <>
            <span>·</span>
            <span>Sec {record.section}</span>
          </>
        ) : null}
      </div>
      {expanded ? (
        <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
          <p className="text-xs text-sub">
            Paid via {record.order.paymentMethod.toUpperCase()}
            {record.receipt.redeemedAt ? (
              <>
                {" "}
                · Redeemed {formatDate(record.receipt.redeemedAt)} at {formatTime(record.receipt.redeemedAt)}
              </>
            ) : null}
          </p>
          <ul className="divide-y divide-line">
            {record.order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-1.5 text-xs">
                <div className="min-w-0">
                  <p className="truncate text-ink">{item.label}</p>
                  {item.meta ? <p className="text-sub">{item.meta}</p> : null}
                  {item.quantity > 1 ? <p className="text-sub">Qty {item.quantity}</p> : null}
                </div>
                <span className="shrink-0 font-medium text-ink">₹{item.unitPrice * item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function PaymentsPage() {
  const [schoolId, setSchoolId] = useState("");
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [records, setRecords] = useState<PaymentRecord[] | null>(null);
  const [filters, setFilters] = useState<PaymentFilters>(EMPTY_FILTERS);

  useEffect(() => {
    getSchools().then((schools) => {
      if (schools.length > 0) setSchoolId(schools[0].id);
      else setRecords([]);
    });
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    getClassLevelsBySchool(schoolId).then(setClassLevels);
    getPaymentsBySchool(schoolId).then(setRecords);
  }, [schoolId]);

  const classLabelById = new Map(classLevels.map((level) => [level.id, level.label]));

  function set<K extends keyof PaymentFilters>(key: K, value: PaymentFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  const filteredRecords = (records ?? []).filter((record) => {
    const search = filters.search.trim().toLowerCase();
    if (
      search &&
      !record.studentName.toLowerCase().includes(search) &&
      !record.registerNumber.toLowerCase().includes(search) &&
      !record.receipt.qrPayload.toLowerCase().includes(search)
    )
      return false;
    if (filters.classLevelId !== ALL_VALUE && record.classLevelId !== filters.classLevelId) return false;
    if (filters.redemptionStatus !== ALL_VALUE && record.receipt.redemptionStatus !== filters.redemptionStatus)
      return false;
    if (filters.paymentMethod !== ALL_VALUE && record.order.paymentMethod !== filters.paymentMethod) return false;
    if (!matchesDateRange(record.receipt.issuedAt, filters.fromDate, filters.toDate)) return false;
    return true;
  });

  const totalAmount = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + r.order.totalAmount, 0),
    [filteredRecords],
  );

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.classLevelId !== ALL_VALUE ||
    filters.redemptionStatus !== ALL_VALUE ||
    filters.paymentMethod !== ALL_VALUE ||
    filters.fromDate !== "" ||
    filters.toDate !== "";

  function handleExport() {
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
      ],
    ];
    filteredRecords.forEach((record) => {
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
        ]);
      });
    });
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const suffix = filters.fromDate || filters.toDate ? `-${filters.fromDate || "start"}-to-${filters.toDate || "now"}` : "";
    link.download = `payments${suffix}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
        <Button variant="outline" className="gap-2" disabled={!filteredRecords.length} onClick={handleExport}>
          <Download className="size-4" />
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
            <div className="w-40 space-y-1.5">
              <Label className="text-xs text-sub">Redemption</Label>
              <Select value={filters.redemptionStatus} onValueChange={(v) => set("redemptionStatus", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
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
              {filteredRecords.length} of {records.length} payments · ₹{totalAmount.toLocaleString("en-IN")}
            </p>
          ) : null}

          {records === null ? (
            <ConsoleListSkeleton />
          ) : filteredRecords.length === 0 ? (
            <p className="rounded-xl border border-line/60 py-10 text-center text-sm text-sub">
              {records.length === 0 ? "No payments recorded yet." : "No payments match these filters."}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredRecords.map((record) => (
                <PaymentCard
                  key={record.receipt.id}
                  record={record}
                  classLabel={classLabelById.get(record.classLevelId) ?? "—"}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
