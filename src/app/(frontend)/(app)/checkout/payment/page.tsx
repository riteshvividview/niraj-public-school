"use client";

import { AlertTriangle, Building2, CheckCircle2, Clock, CreditCard, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { AppHeader } from "@/components/shared/app-header";
import { PaymentAttemptCard } from "@/components/shared/payment-attempt-card";
import { PaymentSuccessOverlay } from "@/components/shared/payment-success-overlay";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTranslation } from "@/i18n/context";
import { formatTemplate } from "@/i18n/format";
import { confirmPayment, checkPaymentStatus, getMyPayments, getPaymentConfig, simulateGateway, startPayment } from "@/lib/data-source";
import { formatCurrencyINR, formatDate, formatTime } from "@/lib/format";
import { loadRazorpay } from "@/lib/razorpay-client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";
import { useCart } from "@/store/cart-store";
import type { CheckoutInstructions, PaymentAttempt, PaymentMethod } from "@/types";

const METHODS: { value: Exclude<PaymentMethod, "other">; icon: typeof Smartphone }[] = [
  { value: "upi", icon: Smartphone },
  { value: "card", icon: CreditCard },
  { value: "netbanking", icon: Building2 },
];

// Minimum time the success overlay stays up, so it's never a flash.
const MIN_SUCCESS_DISPLAY_MS = 2200;

interface DuplicateInfo {
  amount: number;
  paidAt: string;
  receiptId?: string;
  receiptCode?: string;
}

/**
 * Checkout. The payment is recorded as "pending" on the server BEFORE any money
 * moves; the order + receipt exist only once the payment is confirmed. So if the
 * screen dies (power cut, closed tab) nothing is lost or doubled: the parent opens
 * My payments and sees the real status, a second attempt for the same items is
 * refused, and the provider's confirmation settles the payment on its own.
 */
export default function PaymentPage() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const cart = useCart();

  const [method, setMethod] = useState<Exclude<PaymentMethod, "other"> | "">("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paidMethod, setPaidMethod] = useState<PaymentMethod>("upi");
  const [paidItemCount, setPaidItemCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [unconfirmed, setUnconfirmed] = useState<PaymentAttempt | null>(null);
  const [devForceFailure, setDevForceFailure] = useState(false);
  const [devScreenDies, setDevScreenDies] = useState(false);
  const finishing = useRef(false);

  const { data: config } = useSWR(profile ? "payment-config" : null, () => getPaymentConfig());
  const { data: payments, mutate: refreshPayments } = useSWR(profile ? ["my-payments", profile.id] : null, () => getMyPayments(), {
    refreshInterval: (latest) => (latest?.some((payment) => payment.status === "pending") ? 10_000 : 0),
  });
  const pending = payments?.find((payment) => payment.status === "pending") ?? null;
  const testMode = config?.testMode ?? true;

  // Nothing to pay for — bounce back to Cart. Skipped while a payment is in flight / just succeeded,
  // since clearing the cart on success briefly makes count 0 right before navigating to the receipt.
  useEffect(() => {
    if (cart.isReady && cart.count === 0 && !isProcessing && !showSuccess && !finishing.current) {
      router.replace("/cart");
    }
  }, [cart.isReady, cart.count, isProcessing, showSuccess, router]);

  if (!profile || (cart.count === 0 && !isProcessing && !showSuccess)) return null;

  const methodLabels: Record<PaymentMethod, string> = {
    upi: t.payment.upi,
    card: t.payment.card,
    netbanking: t.payment.netbanking,
    other: t.payment.other,
  };

  /** A payment is confirmed: show the success moment, then open the receipt. */
  async function finishPaid(payment: PaymentAttempt, usedMethod: PaymentMethod) {
    if (finishing.current) return;
    finishing.current = true;
    setPaidAmount(payment.amount);
    setPaidMethod(usedMethod);
    setPaidItemCount(payment.items.length);
    setShowSuccess(true);
    await new Promise((resolve) => setTimeout(resolve, MIN_SUCCESS_DISPLAY_MS));
    cart.clear();
    refreshPayments();
    router.push(payment.receipt ? `/receipts/${payment.receipt.id}` : "/receipts");
  }

  async function checkNow(payment: PaymentAttempt) {
    const updated = await checkPaymentStatus(payment.id);
    refreshPayments();
    if (updated.status === "paid") {
      await finishPaid(updated, (updated.method as PaymentMethod) ?? "upi");
      return true;
    }
    return false;
  }

  async function runCheckout(payment: PaymentAttempt, checkout: CheckoutInstructions) {
    if (checkout.type === "simulated") {
      // Test mode: this plays the gateway. One option mimics money taken but the screen dying.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const outcome = devScreenDies ? "confirm-later" : devForceFailure ? "failure" : "success";
      const updated = await simulateGateway(payment.id, outcome, (method || "upi") as PaymentMethod);
      refreshPayments();
      if (updated.status === "paid") await finishPaid(updated, (method || "upi") as PaymentMethod);
      else if (updated.status === "failed") {
        setError(t.payment.failureDescription);
        setIsProcessing(false);
      } else {
        // The "screen died" case — exactly what a parent would be left with.
        setUnconfirmed(updated);
        setIsProcessing(false);
      }
      return;
    }

    // Real provider (Razorpay): open its payment window.
    const Razorpay = await loadRazorpay();
    await new Promise<void>((resolve) => {
      const instance = new Razorpay({
        key: checkout.keyId,
        order_id: checkout.orderId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: checkout.name,
        description: checkout.description,
        prefill: checkout.prefill,
        timeout: checkout.timeoutSeconds,
        handler: async (response) => {
          try {
            const updated = await confirmPayment(payment.id, response as unknown as Record<string, unknown>);
            refreshPayments();
            if (updated.status === "paid") await finishPaid(updated, (updated.method as PaymentMethod) ?? "upi");
            else {
              setUnconfirmed(updated);
              setIsProcessing(false);
            }
          } catch {
            setUnconfirmed(payment);
            setIsProcessing(false);
          }
          resolve();
        },
        modal: {
          ondismiss: async () => {
            // Closed without finishing — it may still have gone through; ask before assuming.
            try {
              if (!(await checkNow(payment))) setUnconfirmed(null);
            } catch {
              /* the pending banner below stays and lets the parent check */
            }
            setIsProcessing(false);
            resolve();
          },
        },
      });
      instance.on("payment.failed", (response) => setError(response.error?.description ?? t.payment.failureDescription));
      instance.open();
    });
  }

  async function handlePay() {
    if (config && !config.available) {
      setError(t.payment.unavailable);
      return;
    }
    if (testMode && !method) return;
    setError(null);
    setDuplicate(null);
    setUnconfirmed(null);
    setIsProcessing(true);
    try {
      const result = await startPayment(cart.items);
      if (result.kind === "duplicate") {
        setDuplicate(result);
        setIsProcessing(false);
        return;
      }
      if (result.kind === "pending") {
        refreshPayments();
        setIsProcessing(false);
        return;
      }
      await runCheckout(result.payment, result.checkout);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.payment.startFailed);
      setIsProcessing(false);
    }
  }

  return (
    <>
      <AppHeader title={t.payment.title} backHref="/cart" showAvatar />
      <div className="w-full space-y-6 p-4 pb-8 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between rounded-lg border border-line/60 bg-card p-4">
          <span className="text-sm text-sub">{t.common.total}</span>
          <span className="font-heading text-xl font-bold text-ink">{formatCurrencyINR(cart.total, language)}</span>
        </div>

        {duplicate ? (
          <div className="space-y-3 rounded-lg border border-section-programs/30 bg-section-programs-bg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-section-programs" />
              <div>
                <p className="font-medium text-section-programs">{t.payment.duplicateTitle}</p>
                <p className="text-sm text-section-programs">
                  {formatTemplate(duplicate.receiptCode ? t.payment.duplicateDescription : t.payment.duplicateNoReceipt, {
                    amount: formatCurrencyINR(duplicate.amount, language),
                    when: `${formatDate(duplicate.paidAt, language)}, ${formatTime(duplicate.paidAt, language)}`,
                    code: duplicate.receiptCode ?? "",
                  })}
                </p>
              </div>
            </div>
            {duplicate.receiptId ? (
              <Button asChild size="sm">
                <Link href={`/receipts/${duplicate.receiptId}`}>{t.payment.viewReceipt}</Link>
              </Button>
            ) : null}
          </div>
        ) : null}

        {pending ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border border-section-programs/30 bg-section-programs-bg p-4">
              <Clock className="mt-0.5 size-5 shrink-0 text-section-programs" />
              <div>
                <p className="font-medium text-section-programs">{t.payment.pendingTitle}</p>
                <p className="text-sm text-section-programs">
                  {formatTemplate(t.payment.pendingDescription, { amount: formatCurrencyINR(pending.amount, language) })}
                </p>
              </div>
            </div>
            <PaymentAttemptCard
              payment={pending}
              onChanged={() => refreshPayments()}
              onSettled={(updated) => void finishPaid(updated, (updated.method as PaymentMethod) ?? "upi")}
            />
          </div>
        ) : null}

        {unconfirmed && !pending ? (
          <div className="flex items-start gap-3 rounded-lg border border-section-programs/30 bg-section-programs-bg p-4">
            <Clock className="mt-0.5 size-5 shrink-0 text-section-programs" />
            <div className="space-y-2">
              <p className="font-medium text-section-programs">{t.payment.notConfirmedTitle}</p>
              <p className="text-sm text-section-programs">{t.payment.notConfirmedDescription}</p>
              <Button asChild size="sm">
                <Link href="/payments">{t.payment.myPayments}</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-3 rounded-lg border border-section-pay/30 bg-section-pay-bg p-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-section-pay" />
            <div>
              <p className="font-medium text-section-pay">{t.payment.failureTitle}</p>
              <p className="text-sm text-section-pay">{error}</p>
            </div>
          </div>
        ) : null}

        {testMode ? (
          <div className="space-y-2">
            <Label>{t.payment.methodLabel}</Label>
            <RadioGroup value={method} onValueChange={(value) => setMethod(value as typeof method)} className="gap-2">
              {METHODS.map(({ value, icon: Icon }) => (
                <Label
                  key={value}
                  htmlFor={`method-${value}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 transition-colors",
                    method === value ? "border-brand bg-section-workspace-bg" : "border-line/60 bg-card hover:bg-muted/50",
                  )}
                >
                  <RadioGroupItem value={value} id={`method-${value}`} />
                  <Icon className="size-5 text-sub" />
                  <span className="font-medium text-ink">{methodLabels[value]}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        ) : null}

        {testMode ? (
          <div className="space-y-2 rounded-lg border border-line/60 bg-muted/60 p-3">
            <p className="text-xs font-medium text-sub">{t.payment.testModeNote}</p>
            <div className="flex items-center gap-2">
              <Checkbox id="dev-force-failure" checked={devForceFailure} onCheckedChange={(checked) => setDevForceFailure(checked === true)} />
              <Label htmlFor="dev-force-failure" className="text-xs text-sub">
                {t.payment.devFailureToggle}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="dev-screen-dies" checked={devScreenDies} onCheckedChange={(checked) => setDevScreenDies(checked === true)} />
              <Label htmlFor="dev-screen-dies" className="text-xs text-sub">
                {t.payment.devDieToggle}
              </Label>
            </div>
          </div>
        ) : null}

        <Button className="w-full" disabled={(testMode && !method) || isProcessing || Boolean(pending)} onClick={handlePay}>
          {isProcessing ? t.payment.processing : error ? t.payment.tryAgain : t.payment.payNow}
        </Button>
      </div>

      {showSuccess ? (
        <PaymentSuccessOverlay
          title={t.payment.successTitle}
          description={t.payment.successDescription}
          amountLabel={formatCurrencyINR(paidAmount, language)}
          methodRowLabel={t.payment.methodLabel}
          paymentMethodLabel={methodLabels[paidMethod]}
          itemsRowLabel={t.payment.itemsLabel}
          itemsLabel={formatTemplate(t.essentials.itemsCount, { n: paidItemCount })}
        />
      ) : null}
    </>
  );
}
