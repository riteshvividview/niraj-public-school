"use client";

import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/context";
import { formatTemplate } from "@/i18n/format";
import { formatCurrencyINR, formatDate, formatTime } from "@/lib/format";
import { cancelPayment, checkPaymentStatus } from "@/lib/data-source";
import { cn } from "@/lib/utils";
import type { PaymentAttempt, PaymentAttemptStatus } from "@/types";

const STATUS_STYLE: Record<PaymentAttemptStatus, { chip: string; icon: typeof Clock }> = {
  paid: { chip: "bg-section-essentials-bg text-section-essentials", icon: CheckCircle2 },
  pending: { chip: "bg-section-programs-bg text-section-programs", icon: Clock },
  failed: { chip: "bg-section-pay-bg text-section-pay", icon: XCircle },
  cancelled: { chip: "bg-muted text-sub", icon: XCircle },
  expired: { chip: "bg-muted text-sub", icon: AlertTriangle },
};

/**
 * One payment attempt: its status, what it was for, and — while it is still
 * pending — the two safe things a parent can do: check where it stands, or
 * cancel it (the server only cancels after the provider shows no money arrived).
 */
export function PaymentAttemptCard({
  payment,
  onChanged,
  onSettled,
}: {
  payment: PaymentAttempt;
  /** Called after any status check / cancel so lists can refresh. */
  onChanged?: (updated: PaymentAttempt) => void;
  /** Called when a check discovers the payment is paid (e.g. to go to the receipt). */
  onSettled?: (updated: PaymentAttempt) => void;
}) {
  const { t, language } = useTranslation();
  const p = t.paymentsPage;
  const [busy, setBusy] = useState<"check" | "cancel" | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const labels: Record<PaymentAttemptStatus, string> = {
    paid: p.statusPaid,
    pending: p.statusPending,
    failed: p.statusFailed,
    cancelled: p.statusCancelled,
    expired: p.statusExpired,
  };
  const { chip, icon: Icon } = STATUS_STYLE[payment.status];
  const note =
    payment.status === "pending"
      ? p.pendingNote
      : payment.status === "failed"
        ? p.failedNote
        : payment.status === "cancelled"
          ? p.cancelledNote
          : payment.status === "expired"
            ? p.expiredNote
            : payment.lateSuccess
              ? p.lateNote
              : null;

  async function check() {
    setBusy("check");
    try {
      const updated = await checkPaymentStatus(payment.id);
      onChanged?.(updated);
      if (updated.status === "paid") onSettled?.(updated);
      else toast.message(updated.status === "pending" ? t.payment.stillPending : p.refreshed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.payment.startFailed);
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy("cancel");
    try {
      const updated = await cancelPayment(payment.id);
      onChanged?.(updated);
      if (updated.status === "paid") onSettled?.(updated);
      else toast.success(t.payment.cancelledToast);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.payment.startFailed);
    } finally {
      setBusy(null);
      setConfirmCancel(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-line/60 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading text-lg font-bold text-ink">{formatCurrencyINR(payment.amount, language)}</p>
          <p className="text-xs text-sub">
            {formatTemplate(p.startedOn, { when: `${formatDate(payment.createdAt, language)}, ${formatTime(payment.createdAt, language)}` })}
          </p>
        </div>
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", chip)}>
          <Icon className="size-3.5" />
          {labels[payment.status]}
        </span>
      </div>

      <ul className="space-y-0.5 text-sm text-ink">
        {payment.items.map((item, index) => (
          <li key={index} className="truncate">
            {item.label}
            {item.meta ? <span className="text-sub"> · {item.meta}</span> : null}
          </li>
        ))}
      </ul>

      {note ? <p className="text-sm text-sub">{note}</p> : null}
      {payment.status === "pending" && payment.failureReason ? (
        <p className="text-sm text-section-pay">{payment.failureReason}</p>
      ) : null}

      {payment.status === "paid" && payment.receipt ? (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
          <span className="text-sub">
            {p.receiptCode}: <span className="font-mono font-medium tracking-widest text-ink">{payment.receipt.code}</span>
          </span>
          <Button asChild size="sm" variant="outline">
            <Link href={`/receipts/${payment.receipt.id}`}>{p.viewReceipt}</Link>
          </Button>
        </div>
      ) : null}

      {payment.status === "pending" ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy !== null} onClick={check}>
            {busy === "check" ? <Loader2 className="size-4 animate-spin" /> : null}
            {busy === "check" ? t.payment.checkingStatus : p.checkStatus}
          </Button>
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => setConfirmCancel(true)}>
            {p.cancelPayment}
          </Button>
        </div>
      ) : null}

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{p.cancelTitle}</AlertDialogTitle>
            <AlertDialogDescription>{p.cancelDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{p.keep}</AlertDialogCancel>
            <AlertDialogAction onClick={cancel}>{p.cancelConfirm}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
