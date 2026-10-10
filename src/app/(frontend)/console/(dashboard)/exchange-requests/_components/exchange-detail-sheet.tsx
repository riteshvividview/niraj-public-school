"use client";

import { ArrowRight, Loader2, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { saveExchangeContactNote, transitionExchangeRequest, type ExchangeAction } from "@/lib/data-source";
import { EXCHANGE_STAFF_NOTE_MIN } from "@/lib/exchange-rules";
import { formatDate, formatTime } from "@/lib/format";
import type { EssentialsStockRow, ExchangeReason, ExchangeRequestRecord, ExchangeStatus } from "@/types";

export const REASON_LABELS: Record<ExchangeReason, string> = {
  "size-too-small": "Size is too small",
  "size-too-large": "Size is too large",
  defect: "Defect / damaged",
  other: "Other",
};

export const STATUS_LABELS: Record<ExchangeStatus, string> = {
  pending: "Pending",
  approved: "Approved — awaiting counter",
  rejected: "Rejected",
  cancelled: "Cancelled",
  completed: "Completed",
};

export const STATUS_STYLES: Record<ExchangeStatus, string> = {
  pending: "bg-section-programs-bg text-section-programs",
  approved: "bg-section-workspace-bg text-section-workspace",
  rejected: "bg-section-pay-bg text-section-pay",
  cancelled: "bg-section-console-bg text-section-console",
  completed: "bg-section-essentials-bg text-section-essentials",
};

export function formatDifference(amount: number): string {
  if (amount === 0) return "No difference";
  return amount > 0 ? `Parent pays ₹${amount}` : `School adjusts ₹${Math.abs(amount)}`;
}

function stockFor(rows: EssentialsStockRow[] | undefined, record: ExchangeRequestRecord, size: string): string {
  if (!rows) return "…";
  const row = rows.find((r) => r.kind === "uniform" && r.refId === record.uniformItemId && r.variantKey === size);
  return row ? `${row.quantityOnHand} in stock` : "not tracked";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-sub">{label}</p>
      <div className="text-sm font-medium text-ink">{children}</div>
    </div>
  );
}

export function ExchangeDetailSheet({
  record,
  classLabel,
  stockRows,
  onClose,
  onChanged,
}: {
  record: ExchangeRequestRecord | null;
  classLabel: string;
  stockRows: EssentialsStockRow[] | undefined;
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <Sheet open={record !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {/* Keyed by id + status so notes/checkboxes reset after every state change. */}
        {record ? (
          <DetailBody
            key={`${record.id}:${record.status}`}
            record={record}
            classLabel={classLabel}
            stockRows={stockRows}
            onChanged={onChanged}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailBody({
  record,
  classLabel,
  stockRows,
  onChanged,
}: {
  record: ExchangeRequestRecord;
  classLabel: string;
  stockRows: EssentialsStockRow[] | undefined;
  onChanged: () => void;
}) {
  const [staffNote, setStaffNote] = useState("");
  const [contactNote, setContactNote] = useState(record.contactNote ?? "");
  const [returnToStock, setReturnToStock] = useState(record.reason !== "defect");
  const [busy, setBusy] = useState<ExchangeAction | "note" | null>(null);

  async function run(action: ExchangeAction) {
    if ((action === "reject" || action === "cancel") && staffNote.trim().length < EXCHANGE_STAFF_NOTE_MIN) {
      toast.error("Please add a short note explaining the decision.");
      return;
    }
    setBusy(action);
    try {
      const result = await transitionExchangeRequest(record.id, action, {
        staffNote: staffNote.trim() || undefined,
        returnToStock,
      });
      const done = {
        approve: "Request approved — the family has been notified.",
        reject: "Request rejected — the family has been notified.",
        cancel: "Request cancelled.",
        complete: "Exchange completed and stock updated.",
      }[action];
      toast.success(done);
      if (result.warning) toast.warning(result.warning, { duration: 8000 });
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
      onChanged();
    } finally {
      setBusy(null);
    }
  }

  async function saveNote() {
    setBusy("note");
    try {
      await saveExchangeContactNote(record.id, contactNote);
      toast.success("Contact note saved.");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the note.");
    } finally {
      setBusy(null);
    }
  }

  const isOpen = record.status === "pending" || record.status === "approved";

  return (
    <>
      <SheetHeader>
        <SheetTitle>Exchange request</SheetTitle>
        <SheetDescription>
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[record.status]}`}>
            {STATUS_LABELS[record.status]}
          </span>
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-5 px-4 pb-6">
        <section className="space-y-3 rounded-xl border border-line/60 p-3.5">
          <Field label="Student">
            {record.student.name}
            <span className="font-normal text-sub">
              {" "}
              · {record.student.registerNumber} · {classLabel}
              {record.student.section ? ` - ${record.student.section}` : ""}
            </span>
          </Field>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {record.student.mobileNumber ? (
              <a href={`tel:${record.student.mobileNumber}`} className="flex items-center gap-1.5 font-medium text-brand hover:underline">
                <Phone className="size-3.5" />
                {record.student.mobileNumber}
              </a>
            ) : (
              <span className="flex items-center gap-1.5 text-sub">
                <Phone className="size-3.5" />
                No phone on file
              </span>
            )}
            {record.student.email ? (
              <a href={`mailto:${record.student.email}`} className="flex items-center gap-1.5 font-medium text-brand hover:underline">
                <Mail className="size-3.5" />
                {record.student.email}
              </a>
            ) : (
              <span className="flex items-center gap-1.5 text-sub">
                <Mail className="size-3.5" />
                No email on file
              </span>
            )}
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-line/60 p-3.5">
          <Field label="Item">{record.itemLabel}</Field>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-lg bg-muted/60 p-2.5">
              <p className="text-xs text-sub">Has (returning)</p>
              <p className="font-heading text-lg font-bold text-ink">{record.fromSize}</p>
              <p className="text-xs text-sub">{stockFor(stockRows, record, record.fromSize)}</p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-sub" />
            <div className="flex-1 rounded-lg bg-muted/60 p-2.5">
              <p className="text-xs text-sub">Wants</p>
              <p className="font-heading text-lg font-bold text-ink">{record.toSize}</p>
              <p className="text-xs text-sub">{stockFor(stockRows, record, record.toSize)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity">{record.quantity}</Field>
            <Field label="Receipt code">
              <span className="font-mono tracking-wider">{record.receiptCode || "—"}</span>
            </Field>
            <Field label="Price difference">{formatDifference(record.priceDifference)}</Field>
            <Field label="Reason">{REASON_LABELS[record.reason]}</Field>
          </div>
          {record.note ? <Field label="Parent's note">{record.note}</Field> : null}
        </section>

        <section className="space-y-1 text-xs text-sub">
          <p>
            Requested {formatDate(record.createdAt)} at {formatTime(record.createdAt)}
          </p>
          {record.decidedAt ? (
            <p>
              {record.status === "rejected" ? "Rejected" : record.status === "cancelled" ? "Cancelled" : "Approved"} by{" "}
              {record.decidedByName ?? "staff"} on {formatDate(record.decidedAt)}
            </p>
          ) : null}
          {record.completedAt ? (
            <p>
              Completed by {record.completedByName ?? "staff"} on {formatDate(record.completedAt)}
              {record.returnedToStock === false ? " · returned item NOT added back to stock" : ""}
            </p>
          ) : null}
          {record.staffNote ? <p className="text-sm text-ink">Staff note: {record.staffNote}</p> : null}
        </section>

        <section className="space-y-2">
          <Label htmlFor="exchange-contact-note" className="text-sm font-medium text-ink">
            Contact log (staff only)
          </Label>
          <Textarea
            id="exchange-contact-note"
            rows={3}
            value={contactNote}
            maxLength={1000}
            placeholder="e.g. Called the parent on 12 Oct — confirmed size 34 is needed."
            onChange={(e) => setContactNote(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={busy !== null || contactNote === (record.contactNote ?? "")}
            onClick={saveNote}
          >
            {busy === "note" ? <Loader2 className="size-4 animate-spin" /> : null}
            Save note
          </Button>
        </section>

        {isOpen ? (
          <section className="space-y-3 border-t border-line pt-4">
            {record.status === "approved" ? (
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
                <Checkbox checked={returnToStock} onCheckedChange={(v) => setReturnToStock(v === true)} className="mt-0.5" />
                <span>
                  Add the returned size ({record.fromSize}) back to stock
                  <span className="block text-xs text-sub">Untick if the item is damaged / not fit for resale.</span>
                </span>
              </label>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="exchange-staff-note" className="text-sm font-medium text-ink">
                {record.status === "pending" ? "Note to the family (required to reject)" : "Note (required to cancel)"}
              </Label>
              <Textarea
                id="exchange-staff-note"
                rows={2}
                value={staffNote}
                maxLength={500}
                onChange={(e) => setStaffNote(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {record.status === "pending" ? (
                <>
                  <Button disabled={busy !== null} onClick={() => run("approve")}>
                    {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : null}
                    Approve
                  </Button>
                  <Button variant="destructive" disabled={busy !== null} onClick={() => run("reject")}>
                    {busy === "reject" ? <Loader2 className="size-4 animate-spin" /> : null}
                    Reject
                  </Button>
                </>
              ) : (
                <>
                  <Button disabled={busy !== null} onClick={() => run("complete")}>
                    {busy === "complete" ? <Loader2 className="size-4 animate-spin" /> : null}
                    Mark completed
                  </Button>
                  <Button variant="outline" disabled={busy !== null} onClick={() => run("cancel")}>
                    {busy === "cancel" ? <Loader2 className="size-4 animate-spin" /> : null}
                    Cancel request
                  </Button>
                </>
              )}
            </div>
            {record.status === "approved" ? (
              <p className="text-xs text-sub">
                Mark completed once the item has been physically swapped at the counter — this moves the stock.
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </>
  );
}
