"use client";

import { AlertTriangle, CheckCircle2, ScanLine } from "lucide-react";
import { useState } from "react";
import { StatusBadge, toBadgeStatus } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { groupItemsByKind } from "@/lib/cart-items";
import { cn } from "@/lib/utils";
import { useReceipts, type ReceiptRecord } from "@/store/receipts-store";

type ScanResult =
  | { kind: "success"; record: ReceiptRecord; markedAs: "collected" | "checked-in" }
  | { kind: "already-redeemed"; record: ReceiptRecord }
  | { kind: "invalid" };

const SCHOOL_ID = "school-niraj";

export default function ScannerPage() {
  const receipts = useReceipts();
  const [selectedId, setSelectedId] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);

  const schoolRecords = receipts.getBySchool(SCHOOL_ID);
  const scannableRecords = schoolRecords.filter((record) => record.receipt.redemptionStatus === "ready");

  function handleScan() {
    if (!selectedId) {
      setResult({ kind: "invalid" });
      return;
    }
    const existing = receipts.getById(selectedId);
    if (!existing) {
      setResult({ kind: "invalid" });
      return;
    }
    if (existing.receipt.redemptionStatus !== "ready") {
      setResult({ kind: "already-redeemed", record: existing });
      return;
    }
    const grouped = groupItemsByKind(existing.order.items);
    const isTicket = grouped.programs.length === existing.order.items.length && grouped.programs.length > 0;
    const markedAs = isTicket ? "checked-in" : "collected";
    const updated = receipts.markRedeemed(selectedId, markedAs);
    if (!updated) {
      setResult({ kind: "invalid" });
      return;
    }
    setResult({ kind: "success", record: updated, markedAs });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Receipt / QR Scanner</h1>
        <p className="text-sm text-sub">
          Verify a parent&apos;s receipt at the counter or event gate. Real camera
          scanning isn&apos;t needed for this preview — select a demo receipt below
          the way a scanned QR code would resolve to one.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Viewfinder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative flex aspect-square w-full max-w-xs items-center justify-center overflow-hidden rounded-2xl bg-ink">
              <div className="absolute inset-6 rounded-xl border-2 border-white/30">
                <span className="absolute -top-0.5 -left-0.5 size-6 rounded-tl-xl border-t-2 border-l-2 border-brand" />
                <span className="absolute -top-0.5 -right-0.5 size-6 rounded-tr-xl border-t-2 border-r-2 border-brand" />
                <span className="absolute -bottom-0.5 -left-0.5 size-6 rounded-bl-xl border-b-2 border-l-2 border-brand" />
                <span className="absolute -bottom-0.5 -right-0.5 size-6 rounded-br-xl border-b-2 border-r-2 border-brand" />
              </div>
              <div className="absolute inset-x-6 h-0.5 animate-[scan_2.2s_ease-in-out_infinite] bg-brand shadow-[0_0_12px_2px_var(--color-brand)]" />
              <ScanLine className="size-10 text-white/40" />
            </div>
            <style>{`
              @keyframes scan {
                0% { top: 1.5rem; }
                50% { top: calc(100% - 1.5rem); }
                100% { top: 1.5rem; }
              }
            `}</style>

            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">Demo: pick the receipt this QR would resolve to</p>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a receipt" />
                </SelectTrigger>
                <SelectContent>
                  {scannableRecords.map((record) => (
                    <SelectItem key={record.receipt.id} value={record.receipt.id}>
                      {record.receipt.id} — ₹{record.order.totalAmount}
                    </SelectItem>
                  ))}
                  {scannableRecords.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No unredeemed receipts right now
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleScan} disabled={!selectedId}>
              Scan
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            {result === null ? (
              <p className="text-sm text-sub">Scan a receipt to see the result here.</p>
            ) : result.kind === "invalid" ? (
              <div className="flex items-start gap-3 rounded-xl border border-section-pay bg-section-pay-bg p-4">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-section-pay" />
                <div>
                  <p className="font-medium text-section-pay">Invalid receipt</p>
                  <p className="text-sm text-section-pay">This QR code doesn&apos;t match any known receipt.</p>
                </div>
              </div>
            ) : result.kind === "already-redeemed" ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-section-programs bg-section-programs-bg p-4">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-section-programs" />
                  <div>
                    <p className="font-medium text-section-programs">Already redeemed</p>
                    <p className="text-sm text-section-programs">
                      This receipt was already marked{" "}
                      {result.record.receipt.redemptionStatus === "checked-in" ? "checked in" : "collected"} on{" "}
                      {result.record.receipt.redeemedAt
                        ? new Date(result.record.receipt.redeemedAt).toLocaleString()
                        : ""}
                      .
                    </p>
                  </div>
                </div>
                <ReceiptSummary record={result.record} />
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4",
                    "border-section-essentials bg-section-essentials-bg",
                  )}
                >
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-section-essentials" />
                  <div>
                    <p className="font-medium text-section-essentials">
                      Marked {result.markedAs === "checked-in" ? "checked in" : "collected"}
                    </p>
                    <p className="text-sm text-section-essentials">Receipt verified successfully.</p>
                  </div>
                </div>
                <ReceiptSummary record={result.record} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReceiptSummary({ record }: { record: ReceiptRecord }) {
  return (
    <div className="space-y-1 rounded-xl border border-line p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-ink">{record.receipt.id}</span>
        <StatusBadge status={toBadgeStatus(record.receipt.redemptionStatus)} />
      </div>
      <p className="text-sub">Order total: ₹{record.order.totalAmount}</p>
      <p className="text-sub">Payment method: {record.order.paymentMethod.toUpperCase()}</p>
      <ul className="mt-1 space-y-0.5 text-sub">
        {record.order.items.map((item) => (
          <li key={item.id}>
            {item.label}
            {item.meta ? ` — ${item.meta}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
