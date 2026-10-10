"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/context";
import { formatTemplate } from "@/i18n/format";
import { EXCHANGE_NOTE_MAX, EXCHANGE_REASONS, exchangePriceDifference } from "@/lib/exchange-rules";
import { createExchangeRequest, getUniformItemById } from "@/lib/data-source";
import { formatCurrencyINR } from "@/lib/format";
import type { ExchangeReason, Order, OrderItem } from "@/types";

/** One uniform line + the order it came from — the unit a parent exchanges. */
export interface ExchangeTarget {
  order: Order;
  item: OrderItem;
}

export function ExchangeFormDialog({
  target,
  onClose,
  onCreated,
}: {
  target: ExchangeTarget | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        {/* Keyed so a different item always starts from a clean form. */}
        {target ? <FormBody key={target.item.id} target={target} onClose={onClose} onCreated={onCreated} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function FormBody({
  target,
  onClose,
  onCreated,
}: {
  target: ExchangeTarget;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t, language } = useTranslation();
  const p = t.exchangePage;
  const { order, item } = target;
  const { data: uniform } = useSWR(["exchange:uniform", item.refId], () => getUniformItemById(item.refId));

  const [toSize, setToSize] = useState("");
  const [reason, setReason] = useState<ExchangeReason | "">("");
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const currentSize = item.meta ?? "";
  const otherSizes = (uniform?.sizeOptions ?? []).filter((option) => option.size !== currentSize);
  const chosen = otherSizes.find((option) => option.size === toSize);
  const difference = chosen ? exchangePriceDifference(item.unitPrice, chosen.price, quantity) : null;

  const reasonLabels: Record<ExchangeReason, string> = {
    "size-too-small": p.reasonSizeTooSmall,
    "size-too-large": p.reasonSizeTooLarge,
    defect: p.reasonDefect,
    other: p.reasonOther,
  };

  async function submit() {
    if (!toSize || !reason || submitting) return;
    setSubmitting(true);
    try {
      await createExchangeRequest({
        orderId: order.id,
        orderItemId: item.id,
        toSize,
        reason,
        note: note.trim() || undefined,
        quantity,
      });
      toast.success(p.successTitle, { description: p.successDescription });
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : p.submitFailed);
      setSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{p.formTitle}</DialogTitle>
        <DialogDescription>{item.label}</DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-line/60 bg-muted/40 p-3">
            <p className="text-xs text-sub">{p.currentSizeLabel}</p>
            <p className="font-heading text-lg font-bold text-ink">{currentSize}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exchange-new-size" className="text-xs text-sub">
              {p.newSizeLabel}
            </Label>
            <Select value={toSize} onValueChange={setToSize} disabled={!uniform}>
              <SelectTrigger id="exchange-new-size" className="w-full">
                <SelectValue placeholder={p.chooseNewSize} />
              </SelectTrigger>
              <SelectContent>
                {otherSizes.map((option) => (
                  <SelectItem key={option.size} value={option.size}>
                    {option.size} — {formatCurrencyINR(option.price, language)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {item.quantity > 1 ? (
          <div className="space-y-1.5">
            <Label htmlFor="exchange-qty" className="text-sm font-medium text-ink">
              {p.quantityLabel}
            </Label>
            <Select value={String(quantity)} onValueChange={(v) => setQuantity(Number(v))}>
              <SelectTrigger id="exchange-qty" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: item.quantity }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label className="text-sm font-medium text-ink">{p.reasonLabel}</Label>
          <RadioGroup value={reason} onValueChange={(v) => setReason(v as ExchangeReason)} className="gap-2">
            {EXCHANGE_REASONS.map((value) => (
              <label
                key={value}
                htmlFor={`exchange-reason-${value}`}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-line/60 bg-card p-3 text-sm text-ink has-[[data-state=checked]]:border-brand has-[[data-state=checked]]:bg-section-workspace-bg"
              >
                <RadioGroupItem id={`exchange-reason-${value}`} value={value} />
                {reasonLabels[value]}
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exchange-note" className="text-sm font-medium text-ink">
            {p.noteLabel}
          </Label>
          <Textarea
            id="exchange-note"
            value={note}
            maxLength={EXCHANGE_NOTE_MAX}
            placeholder={p.notePlaceholder}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
          <p className="text-right text-xs text-sub">
            {note.length}/{EXCHANGE_NOTE_MAX}
          </p>
        </div>

        {difference !== null ? (
          <div className="rounded-lg border border-line/60 bg-muted/40 p-3">
            <p className="text-xs text-sub">{p.priceDifferenceLabel}</p>
            <p className="font-heading text-sm font-semibold text-ink">
              {difference > 0
                ? formatTemplate(p.youPayTemplate, { amount: formatCurrencyINR(difference, language) })
                : difference < 0
                  ? formatTemplate(p.schoolAdjustsTemplate, { amount: formatCurrencyINR(Math.abs(difference), language) })
                  : p.noPriceDifference}
            </p>
            <p className="mt-1 text-xs text-sub">{p.settledAtCounterNote}</p>
          </div>
        ) : null}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          {t.common.back}
        </Button>
        <Button onClick={submit} disabled={!toSize || !reason || submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitting ? p.submitting : p.submit}
        </Button>
      </DialogFooter>
    </>
  );
}
