"use client";

import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/context";
import { uniformToCartItem } from "@/lib/cart-items";
import { cancelExtraItemRequest, createExtraItemRequest, getMyExtraItemRequests } from "@/lib/data-source";
import { formatCurrencyINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { lineId, useCart } from "@/store/cart-store";
import type { ExtraItemRequest, ExtraItemStatus, UniformItem } from "@/types";

/**
 * After a new-admission student has bought their full set, any single extra item goes through the
 * school first (only staff know if it is in stock): ask → the school approves → pay online → collect.
 */
export function ExtraItemRequests({ items, userId }: { items: UniformItem[]; userId: string }) {
  const { t, language } = useTranslation();
  const cart = useCart();
  const { data: requests, mutate } = useSWR(["extra-item-requests", userId], () => getMyExtraItemRequests(userId), { refreshInterval: 30_000 });
  const [dialogItem, setDialogItem] = useState<UniformItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const n = t.newAdmission;
  const itemById = new Map(items.map((item) => [item.id, item]));
  const open = (itemId: string) => requests?.find((r) => r.uniformItemId === itemId && (r.status === "pending" || r.status === "approved"));
  const approved = (requests ?? []).filter((r) => r.status === "approved");
  const history = (requests ?? []).filter((r) => r.status !== "approved");

  const statusLabel: Record<ExtraItemStatus, string> = {
    pending: n.statusPending,
    approved: n.statusApproved,
    rejected: n.statusRejected,
    cancelled: n.statusCancelled,
    used: n.statusUsed,
  };

  async function cancel(request: ExtraItemRequest) {
    setBusyId(request.id);
    try {
      await cancelExtraItemRequest(request.id);
      cart.remove(lineId("uniform", request.uniformItemId));
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : n.statusRejected);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-section-essentials/30 bg-section-essentials-bg p-4 text-sm text-section-essentials">
        <p className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="size-4 shrink-0" />
          {n.setBought}
        </p>
      </div>

      {approved.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-heading text-base font-semibold text-ink">{n.approvedTitle}</h2>
          {approved.map((request) => {
            const item = itemById.get(request.uniformItemId);
            const id = lineId("uniform", request.uniformItemId);
            const inCart = Boolean(cart.getItem(id));
            const option = item?.sizeOptions.find((o) => o.size === request.size);
            return (
              <div key={request.id} className="space-y-2 rounded-lg border border-section-essentials/30 bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{request.itemLabel}</p>
                    <p className="text-sm text-sub">
                      {n.sizeLabel}: {request.size}
                      {option ? ` · ${formatCurrencyINR(option.price, language)}` : ""}
                    </p>
                  </div>
                  {item && option ? (
                    inCart ? (
                      <span className="text-sm font-medium text-section-essentials">{n.inCart}</span>
                    ) : (
                      <Button size="sm" onClick={() => cart.setIncluded(uniformToCartItem(item, request.size, option.price), true)}>
                        {n.addToCart}
                      </Button>
                    )
                  ) : null}
                </div>
                {request.staffNote ? (
                  <p className="text-sm text-sub">
                    {n.schoolNote}: {request.staffNote}
                  </p>
                ) : null}
                <Button size="sm" variant="ghost" disabled={busyId !== null} onClick={() => cancel(request)}>
                  {busyId === request.id ? <Loader2 className="size-4 animate-spin" /> : null}
                  {n.cancelRequest}
                </Button>
              </div>
            );
          })}
        </section>
      ) : null}

      <section className="space-y-2">
        <div>
          <h2 className="font-heading text-base font-semibold text-ink">{n.extrasTitle}</h2>
          <p className="text-sm text-sub">{n.extrasDescription}</p>
        </div>
        {items.map((item) => {
          const existing = open(item.id);
          return (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border border-line/60 bg-card p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{item.name}</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">{formatCurrencyINR(item.sizeOptions[0].price, language)}</p>
              </div>
              {existing ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-sub">
                  <Clock className="size-3" />
                  {statusLabel[existing.status]}
                </span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setDialogItem(item)}>
                  {n.request}
                </Button>
              )}
            </div>
          );
        })}
      </section>

      {history.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-heading text-base font-semibold text-ink">{n.myRequests}</h2>
          {history.map((request) => (
            <div key={request.id} className="space-y-1 rounded-lg border border-line/60 bg-card p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-ink">
                  {request.itemLabel} <span className="text-sub">· {request.size}</span>
                </p>
                <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-medium", request.status === "used" ? "text-section-essentials" : request.status === "rejected" ? "text-section-pay" : "text-sub")}>
                  {request.status === "rejected" ? <XCircle className="size-3.5" /> : request.status === "pending" ? <Clock className="size-3.5" /> : null}
                  {statusLabel[request.status]}
                </span>
              </div>
              {request.staffNote ? (
                <p className="text-xs text-sub">
                  {n.schoolNote}: {request.staffNote}
                </p>
              ) : null}
              {request.status === "pending" ? (
                <Button size="sm" variant="ghost" disabled={busyId !== null} onClick={() => cancel(request)}>
                  {n.cancelRequest}
                </Button>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {dialogItem ? (
        <RequestDialog
          key={dialogItem.id}
          item={dialogItem}
          onClose={() => setDialogItem(null)}
          onSent={async () => {
            setDialogItem(null);
            toast.success(n.requestSent);
            await mutate();
          }}
        />
      ) : null}
    </div>
  );
}

function RequestDialog({ item, onClose, onSent }: { item: UniformItem; onClose: () => void; onSent: () => void | Promise<void> }) {
  const { t } = useTranslation();
  const n = t.newAdmission;
  const [size, setSize] = useState(item.sizeOptions[0].size);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    try {
      await createExtraItemRequest({ uniformItemId: item.id, size, note: note.trim() || undefined });
      await onSent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : n.statusRejected);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{n.requestTitle}</DialogTitle>
          <DialogDescription>
            {item.name} — {n.requestDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {item.sizeOptions.length > 1 ? (
            <div className="space-y-1.5">
              <Label>{n.sizeLabel}</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {item.sizeOptions.map((option) => (
                    <SelectItem key={option.size} value={option.size}>
                      {option.size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>{n.noteLabel}</Label>
            <Textarea rows={2} maxLength={500} value={note} placeholder={n.notePlaceholder} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={sending} onClick={send}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : null}
            {n.sendRequest}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
