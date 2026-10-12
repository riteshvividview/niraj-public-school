"use client";

import { AddressBlock } from "@/components/console/address-display";
import { AlertTriangle, CheckCircle2, Loader2, ScanLine, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge, toBadgeStatus } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { deriveReceiptTitle, groupItemsByKind } from "@/lib/cart-items";
import { getReceiptByCode, markReceiptRedeemed, updateOrderItemsCollected } from "@/lib/data-source";
import { useConsoleSchoolId, useNewAdmissionInfo } from "@/lib/hooks/console-data";
import { NewAdmissionBadge } from "../students/_components/student-shared";
import { CollectionControls } from "./_components/collection-controls";
import type { PaymentRecord, ReceiptRecord } from "@/types";

type LookupResult =
  | { kind: "invalid" }
  | { kind: "found"; record: ReceiptRecord };

/** A program-only order is a "ticket" (check in at a gate); anything else is collected item-by-item at the counter. */
function isTicketRecord(record: ReceiptRecord): boolean {
  const grouped = groupItemsByKind(record.order.items);
  return grouped.programs.length === record.order.items.length && grouped.programs.length > 0;
}

export default function ScannerPage() {
  const schoolId = useConsoleSchoolId();
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  async function refreshLookup() {
    if (!schoolId) return;
    const record = await getReceiptByCode(schoolId, code);
    setLookup(record ? { kind: "found", record } : { kind: "invalid" });
  }

  async function handleLookup(event: FormEvent) {
    event.preventDefault();
    if (!code.trim() || !schoolId) return;
    setIsLookingUp(true);
    try {
      await refreshLookup();
    } catch {
      toast.error("Couldn't look that up. Please try again.");
    } finally {
      setIsLookingUp(false);
    }
  }

  /** Whole-receipt program check-in — unchanged from before per-item tracking existed. */
  async function handleCheckIn() {
    if (lookup?.kind !== "found") return;
    setIsRedeeming(true);
    const updated = await markReceiptRedeemed(lookup.record.receipt.id, "checked-in");
    setIsRedeeming(false);
    setConfirmOpen(false);
    if (!updated) return;
    // markReceiptRedeemed returns the bare receipt — keep the student/address details already on screen.
    setLookup({ kind: "found", record: { ...lookup.record, ...updated } });
    toast.success("Marked attended");
  }

  /**
   * Saves every pending per-item toggle in one call — see CollectionControls,
   * which batches checkbox changes locally so this fires once per "Save
   * changes" click, not once per click on an item.
   */
  async function handleSaveCollection(changes: Record<string, boolean>) {
    if (lookup?.kind !== "found") return;
    setIsSaving(true);
    try {
      await updateOrderItemsCollected(lookup.record.order.id, changes);
      await refreshLookup();
      toast.success("Collection status updated");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Receipt / QR Scanner</h1>
        <p className="text-sm text-sub">
          Verify a parent&apos;s receipt at the counter or event gate. Real camera
          scanning isn&apos;t wired up yet — type or paste the receipt code shown
          on the parent&apos;s ticket instead.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Look Up Receipt</CardTitle>
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

            <form className="space-y-2" onSubmit={handleLookup}>
              <Label htmlFor="receipt-code">Receipt code</Label>
              <div className="flex gap-2">
                <Input
                  id="receipt-code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setLookup(null);
                  }}
                  placeholder="e.g. K7H4X9RT"
                  className="font-mono tracking-widest uppercase"
                  autoComplete="off"
                />
                <Button type="submit" disabled={!code.trim() || !schoolId || isLookingUp} className="gap-1.5">
                  {isLookingUp ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  {isLookingUp ? "Looking up…" : "Look Up"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            {isLookingUp ? (
              <div role="status" aria-label="Looking up" className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
            ) : lookup === null ? (
              <p className="text-sm text-sub">Look up a receipt code to see the result here.</p>
            ) : lookup.kind === "invalid" ? (
              <div className="flex items-start gap-3 rounded-xl border border-section-pay bg-section-pay-bg p-4">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-section-pay" />
                <div>
                  <p className="font-medium text-section-pay">Invalid receipt</p>
                  <p className="text-sm text-section-pay">This code doesn&apos;t match any known receipt.</p>
                </div>
              </div>
            ) : isTicketRecord(lookup.record) ? (
              // Program check-in — unchanged whole-receipt flow.
              lookup.record.receipt.redemptionStatus === "checked-in" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg bg-section-essentials-bg p-2 text-section-essentials">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span className="font-medium">Marked attended</span>
                  </div>
                  <ReceiptSummary record={lookup.record} />
                </div>
              ) : (
                <div className="space-y-3">
                  <ReceiptSummary record={lookup.record} />
                  <Button className="w-full" onClick={() => setConfirmOpen(true)} disabled={isRedeeming}>
                    Mark Attended
                  </Button>
                </div>
              )
            ) : (
              // Books/Uniform receipt — per-item / per-category collection.
              <div className="space-y-3">
                <ReceiptSummary record={lookup.record} />
                <CollectionControls
                  key={lookup.record.order.id + lookup.record.order.updatedAt}
                  record={lookup.record}
                  isSaving={isSaving}
                  onSave={handleSaveCollection}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark attended?</AlertDialogTitle>
            <AlertDialogDescription>
              This confirms the parent has checked in for the program against receipt{" "}
              {lookup?.kind === "found" ? lookup.record.receipt.qrPayload : ""}. This can&apos;t be undone
              from here — a staff member would need to fix it via /admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCheckIn} disabled={isRedeeming}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const RECEIPT_TITLE_LABELS = {
  books: "Books",
  uniform: "Uniform",
  receiptWord: "Receipt",
  programmeReceiptWord: "Programme Receipt",
};

function ReceiptSummary({ record }: { record: ReceiptRecord }) {
  const title = deriveReceiptTitle(record.order.items, RECEIPT_TITLE_LABELS);
  const student = "studentName" in record ? (record as PaymentRecord) : null;
  const newAdmissionInfo = useNewAdmissionInfo(record.receipt.schoolId);
  return (
    <div className="space-y-2 rounded-xl border border-line p-4 text-sm">
      {student ? (
        <div className="space-y-2 rounded-lg bg-muted/50 p-3">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-ink">
            <span>
              {student.studentName} <span className="font-normal text-sub">· {student.registerNumber}</span>
            </span>
            <NewAdmissionBadge student={{ registerNumber: student.registerNumber, newAdmissionOverride: student.newAdmissionOverride }} info={newAdmissionInfo} />
          </p>
          <AddressBlock address={student.address} fallbackPhone={student.studentPhone} />
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <span className="font-medium text-ink">{title}</span>
        <StatusBadge status={toBadgeStatus(record.receipt.redemptionStatus)} />
      </div>
      <div className="flex items-center justify-between">
        <span className="font-mono tracking-widest text-ink">{record.receipt.qrPayload}</span>
        <span className="text-xs text-sub">{new Date(record.receipt.issuedAt).toLocaleString()}</span>
      </div>
      <p className="text-sub">Payment method: {record.order.paymentMethod.toUpperCase()}</p>
      <ul className="mt-1 divide-y divide-line">
        {record.order.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-1.5">
            <div>
              <p className="text-ink">{item.label}</p>
              {item.meta ? <p className="text-xs text-sub">{item.meta}</p> : null}
              {item.quantity > 1 ? <p className="text-xs text-sub">Qty {item.quantity}</p> : null}
            </div>
            <span className="shrink-0 font-medium text-ink">₹{item.unitPrice * item.quantity}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-line pt-2 font-medium text-ink">
        <span>Total</span>
        <span>₹{record.order.totalAmount}</span>
      </div>
    </div>
  );
}
