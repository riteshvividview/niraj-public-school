"use client";

import { AlertTriangle, CheckCircle2, ScanLine, Search } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deriveReceiptTitle, groupItemsByKind } from "@/lib/cart-items";
import { getReceiptByCode, markReceiptRedeemed, updateOrderItemsCollected } from "@/lib/data-source";
import { useConsoleSchoolId } from "@/lib/hooks/console-data";
import { cn } from "@/lib/utils";
import type { OrderItem, ReceiptRecord } from "@/types";

type LookupResult =
  | { kind: "invalid" }
  | { kind: "found"; record: ReceiptRecord };

/** A program-only order is a "ticket" (check in at a gate); anything else is collected item-by-item at the counter. */
function isTicketRecord(record: ReceiptRecord): boolean {
  const grouped = groupItemsByKind(record.order.items);
  return grouped.programs.length === record.order.items.length && grouped.programs.length > 0;
}

const CATEGORY_LABELS: Record<"books" | "uniform" | "programs", string> = {
  books: "Books",
  uniform: "Uniform & Kit",
  programs: "Programs",
};

export default function ScannerPage() {
  const schoolId = useConsoleSchoolId();
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function refreshLookup() {
    if (!schoolId) return;
    const record = await getReceiptByCode(schoolId, code);
    setLookup(record ? { kind: "found", record } : { kind: "invalid" });
  }

  async function handleLookup(event: FormEvent) {
    event.preventDefault();
    if (!code.trim() || !schoolId) return;
    await refreshLookup();
  }

  /** Whole-receipt program check-in — unchanged from before per-item tracking existed. */
  async function handleCheckIn() {
    if (lookup?.kind !== "found") return;
    setIsRedeeming(true);
    const updated = await markReceiptRedeemed(lookup.record.receipt.id, "checked-in");
    setIsRedeeming(false);
    setConfirmOpen(false);
    if (!updated) return;
    setLookup({ kind: "found", record: updated });
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
                <Button type="submit" disabled={!code.trim() || !schoolId} className="gap-1.5">
                  <Search className="size-4" />
                  Look Up
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
            {lookup === null ? (
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

/**
 * Per-item collected/uncollected checkboxes plus one "Mark all collected"
 * button per category (Books / Uniform & Kit). Every toggle only changes
 * local state — nothing is written until "Save changes" is clicked, which
 * sends every pending change in a single request rather than one per
 * click. Un-checking an already-collected item (a staff correction, e.g.
 * "payment showed successful but didn't actually go through") asks for
 * confirmation before the toggle is even staged, since it's a reversal.
 */
function CollectionControls({
  record,
  isSaving,
  onSave,
}: {
  record: ReceiptRecord;
  isSaving: boolean;
  onSave: (changes: Record<string, boolean>) => void;
}) {
  const grouped = groupItemsByKind(record.order.items) as Record<"books" | "uniform" | "programs", OrderItem[]>;
  const categories = (["books", "uniform"] as const).filter((key) => grouped[key].length > 0);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [uncollectTarget, setUncollectTarget] = useState<OrderItem | null>(null);

  if (categories.length === 0) return null;

  function isCollected(item: OrderItem): boolean {
    return item.id in pending ? pending[item.id] : Boolean(item.collectedAt);
  }

  function setPendingFor(item: OrderItem, collected: boolean) {
    setPending((prev) => {
      const next = { ...prev };
      // Persisted state matches the request again — nothing to save for this row.
      if (collected === Boolean(item.collectedAt)) {
        delete next[item.id];
      } else {
        next[item.id] = collected;
      }
      return next;
    });
  }

  function handleToggle(item: OrderItem, checked: boolean) {
    if (!checked && isCollected(item) && item.collectedAt) {
      // Reversing an already-persisted collection — confirm first.
      setUncollectTarget(item);
      return;
    }
    setPendingFor(item, checked);
  }

  const changedCount = Object.keys(pending).length;

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const items = grouped[category];
        const stillUncollected = items.filter((item) => !isCollected(item));
        return (
          <div key={category} className="space-y-2 rounded-xl border border-line p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">{CATEGORY_LABELS[category]}</span>
              {stillUncollected.length > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => stillUncollected.forEach((item) => setPendingFor(item, true))}
                >
                  Mark all {CATEGORY_LABELS[category].toLowerCase()} collected
                </Button>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-section-essentials">
                  <CheckCircle2 className="size-3.5" /> All collected
                </span>
              )}
            </div>
            <ul className="divide-y divide-line">
              {items.map((item) => {
                const collected = isCollected(item);
                const isDirty = item.id in pending;
                return (
                  <li key={item.id} className="flex items-center gap-3 py-2 text-sm">
                    <Checkbox
                      checked={collected}
                      onCheckedChange={(checked) => handleToggle(item, checked === true)}
                      aria-label={`Mark ${item.label} collected`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-ink">{item.label}</p>
                      {item.meta ? <p className="truncate text-xs text-sub">{item.meta}</p> : null}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-xs font-medium",
                        isDirty ? "text-section-programs" : collected ? "text-section-essentials" : "text-sub",
                      )}
                    >
                      {isDirty
                        ? collected
                          ? "Will mark collected"
                          : "Will mark uncollected"
                        : collected
                          ? `Collected ${item.collectedAt ? new Date(item.collectedAt).toLocaleDateString() : ""}`
                          : "Not collected"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {changedCount > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-muted/50 p-3">
          <span className="text-sm text-sub">
            {changedCount} pending change{changedCount === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={isSaving} onClick={() => setPending({})}>
              Discard
            </Button>
            <Button size="sm" disabled={isSaving} onClick={() => onSave(pending)}>
              Save changes
            </Button>
          </div>
        </div>
      ) : null}

      <AlertDialog open={uncollectTarget !== null} onOpenChange={(open) => !open && setUncollectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark &quot;{uncollectTarget?.label}&quot; as uncollected?</AlertDialogTitle>
            <AlertDialogDescription>
              Use this only to correct a mistake (e.g. it was marked collected but the parent never actually
              picked it up). This won&apos;t take effect until you click &quot;Save changes&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (uncollectTarget) setPendingFor(uncollectTarget, false);
                setUncollectTarget(null);
              }}
            >
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
  return (
    <div className="space-y-2 rounded-xl border border-line p-4 text-sm">
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
