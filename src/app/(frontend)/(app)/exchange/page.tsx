"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Clock, Receipt as ReceiptIcon, Repeat, Shirt } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { AppHeader } from "@/components/shared/app-header";
import { ListSkeleton } from "@/components/shared/loading-skeletons";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/context";
import { formatTemplate } from "@/i18n/format";
import { deriveReceiptTitle } from "@/lib/cart-items";
import { cancelExchangeRequest, getExchangeRequestsByUser, getReceiptsByUser } from "@/lib/data-source";
import {
  ACTIVE_EXCHANGE_STATUSES,
  exchangeDaysLeft,
  getExchangeEligibility,
  type ExchangeIneligibleReason,
} from "@/lib/exchange-rules";
import { formatCurrencyINR, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";
import type { ExchangeRequest, ReceiptRecord } from "@/types";
import { ExchangeFormDialog, type ExchangeTarget } from "./_components/exchange-form-dialog";
import { ExchangeStatusBadge, useExchangeStatusText } from "./_components/exchange-status";

type Tab = "new" | "requests";

export default function ExchangePage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>("new");

  const { data: requests, mutate: mutateRequests } = useSWR(profile ? ["exchange:requests", profile.id] : null, () =>
    getExchangeRequestsByUser(profile!.id),
  );
  if (!profile) return null;

  const pendingCount = requests?.filter((r) => r.status === "pending" || r.status === "approved").length ?? 0;

  return (
    <>
      <AppHeader title={t.exchangePage.title} showAvatar />
      <div className="w-full space-y-4 p-4 pb-8 sm:p-6 lg:p-8">
        <p className="text-sm text-sub">{t.exchangePage.subtitle}</p>

        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {(["new", "requests"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                tab === value ? "bg-card text-ink shadow-sm" : "text-sub hover:text-ink",
              )}
            >
              {value === "new" ? t.exchangePage.tabNew : t.exchangePage.tabRequests}
              {value === "requests" && pendingCount > 0 ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white">
                  {pendingCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === "new" ? (
          <NewRequestTab
            userId={profile.id}
            requests={requests ?? []}
            onCreated={async () => {
              await mutateRequests();
              setTab("requests");
            }}
          />
        ) : (
          <RequestsTab requests={requests} onChanged={() => mutateRequests()} />
        )}
      </div>
    </>
  );
}

/* ------------------------------ new request ------------------------------ */

function NewRequestTab({
  userId,
  requests,
  onCreated,
}: {
  userId: string;
  requests: ExchangeRequest[];
  onCreated: () => void | Promise<void>;
}) {
  const { t, language } = useTranslation();
  const p = t.exchangePage;
  const { data: records } = useSWR(["exchange:receipts", userId], () => getReceiptsByUser(userId));
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [target, setTarget] = useState<ExchangeTarget | null>(null);

  if (!records) return <ListSkeleton count={4} />;

  const withUniform = records.filter((record) => record.order.items.some((item) => item.kind === "uniform"));
  const selected = receiptId ? withUniform.find((record) => record.receipt.id === receiptId) : undefined;

  if (records.length === 0) {
    return <EmptyState icon={ReceiptIcon} title={p.noReceiptsTitle} description={p.noReceiptsDescription} />;
  }
  if (withUniform.length === 0) {
    return <EmptyState icon={Shirt} title={p.noUniformTitle} description={p.noUniformDescription} />;
  }

  const activeIds = new Set(requests.filter((r) => ACTIVE_EXCHANGE_STATUSES.includes(r.status)).map((r) => r.orderItemId));
  const exchangedIds = new Set(requests.filter((r) => r.status === "completed").map((r) => r.orderItemId));
  const titleLabels = {
    books: t.receiptsPage.titleBooks,
    uniform: t.receiptsPage.titleUniform,
    receiptWord: t.receiptsPage.titleReceiptWord,
    programmeReceiptWord: t.receiptsPage.titleProgrammeReceiptWord,
  };

  const ineligibleText: Record<ExchangeIneligibleReason, string> = {
    "not-uniform": p.noUniformDescription,
    "not-paid": p.ineligibleNotPaid,
    "not-collected": p.ineligibleNotCollected,
    "window-closed": p.ineligibleWindowClosed,
    "already-requested": p.ineligibleAlreadyRequested,
    "already-exchanged": p.ineligibleAlreadyExchanged,
    "no-sizes": p.ineligibleWindowClosed,
  };

  return (
    <>
      {selected ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setReceiptId(null)}
            className="flex cursor-pointer items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            <ChevronLeft className="size-4" />
            {p.chooseReceiptTitle}
          </button>

          <div className="rounded-lg border border-line/60 bg-card p-4">
            <p className="font-medium text-ink">{deriveReceiptTitle(selected.order.items, titleLabels)}</p>
            <p className="text-sm text-sub">
              {p.receiptWord} <span className="font-mono font-semibold">{selected.receipt.qrPayload}</span> ·{" "}
              {formatDate(selected.receipt.issuedAt, language)}
            </p>
          </div>

          <ul className="space-y-2.5">
            {selected.order.items
              .filter((item) => item.kind === "uniform")
              .map((item) => {
                const eligibility = getExchangeEligibility(item, selected.order, activeIds, exchangedIds);
                const daysLeft = eligibility.eligible ? exchangeDaysLeft(eligibility.deadline) : 0;
                return (
                  <li key={item.id} className="rounded-lg border border-line/60 bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{item.label}</p>
                        <p className="text-sm text-sub">
                          {p.sizeLabel}: <span className="font-semibold text-ink">{item.meta}</span> · {p.quantityLabel}:{" "}
                          {item.quantity} · {formatCurrencyINR(item.unitPrice * item.quantity, language)}
                        </p>
                      </div>
                    </div>
                    {eligibility.eligible ? (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-xs text-sub">
                          <Clock className="size-3.5" />
                          {formatTemplate(p.eligibleUntilTemplate, {
                            date: formatDate(eligibility.deadline, language),
                            n: daysLeft,
                          })}
                        </p>
                        <Button size="sm" onClick={() => setTarget({ order: selected.order, item })}>
                          {p.requestExchange}
                          <ArrowRight className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-sub">{ineligibleText[eligibility.reason]}</p>
                    )}
                  </li>
                );
              })}
          </ul>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="font-heading text-base font-semibold text-ink">{p.chooseReceiptTitle}</p>
            <p className="text-sm text-sub">{p.chooseReceiptHint}</p>
          </div>
          <ul className="space-y-2.5">
            {withUniform.map((record: ReceiptRecord) => (
              <li key={record.receipt.id}>
                <button
                  type="button"
                  onClick={() => setReceiptId(record.receipt.id)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-line/60 bg-card p-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{deriveReceiptTitle(record.order.items, titleLabels)}</p>
                    <p className="text-sm text-sub">
                      {p.receiptWord} <span className="font-mono font-semibold">{record.receipt.qrPayload}</span> ·{" "}
                      {formatDate(record.receipt.issuedAt, language)}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-sub" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ExchangeFormDialog
        target={target}
        onClose={() => setTarget(null)}
        onCreated={async () => {
          setTarget(null);
          await onCreated();
        }}
      />
    </>
  );
}

/* ------------------------------ my requests ------------------------------ */

function RequestsTab({ requests, onChanged }: { requests: ExchangeRequest[] | undefined; onChanged: () => void }) {
  const { t, language } = useTranslation();
  const p = t.exchangePage;
  const { help } = useExchangeStatusText();
  const [cancelling, setCancelling] = useState<ExchangeRequest | null>(null);

  if (!requests) return <ListSkeleton count={3} />;
  if (requests.length === 0) {
    return <EmptyState icon={Repeat} title={p.noRequestsTitle} description={p.noRequestsDescription} />;
  }

  async function confirmCancel() {
    if (!cancelling) return;
    const id = cancelling.id;
    setCancelling(null);
    try {
      await cancelExchangeRequest(id);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : p.cancelFailed);
      onChanged();
    }
  }

  return (
    <>
      <ul className="space-y-2.5">
        {requests.map((request) => (
          <li key={request.id} className="rounded-lg border border-line/60 bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-ink">{request.itemLabel}</p>
                <p className="flex items-center gap-1.5 text-sm text-sub">
                  <span className="font-semibold text-ink">{request.fromSize}</span>
                  <ArrowRight className="size-3.5" />
                  <span className="font-semibold text-ink">{request.toSize}</span>
                  <span>· {p.quantityLabel} {request.quantity}</span>
                </p>
              </div>
              <ExchangeStatusBadge status={request.status} />
            </div>
            <p className="mt-2 text-sm text-sub">{help[request.status]}</p>
            {request.staffNote ? (
              <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm text-ink">
                <span className="text-xs font-semibold tracking-wide text-sub uppercase">{p.noteFromSchool}: </span>
                {request.staffNote}
              </p>
            ) : null}
            {request.status === "approved" && request.priceDifference !== 0 ? (
              <p className="mt-2 text-sm font-medium text-ink">
                {request.priceDifference > 0
                  ? formatTemplate(p.youPayTemplate, { amount: formatCurrencyINR(request.priceDifference, language) })
                  : formatTemplate(p.schoolAdjustsTemplate, {
                      amount: formatCurrencyINR(Math.abs(request.priceDifference), language),
                    })}
              </p>
            ) : null}
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs text-sub">
                {p.requestedOn} {formatDate(request.createdAt, language)}
              </p>
              {request.status === "pending" ? (
                <Button variant="outline" size="sm" onClick={() => setCancelling(request)}>
                  {p.cancelRequest}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDeleteDialog
        open={cancelling !== null}
        onOpenChange={(open) => (!open ? setCancelling(null) : undefined)}
        title={p.cancelConfirmTitle}
        description={p.cancelConfirmDescription}
        confirmLabel={p.cancelRequest}
        cancelLabel={p.keepRequest}
        onConfirm={confirmCancel}
      />
    </>
  );
}
