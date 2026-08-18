"use client";

import { AlertTriangle, Building2, CreditCard, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { PaymentSuccessOverlay } from "@/components/shared/payment-success-overlay";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTranslation } from "@/i18n/context";
import { formatTemplate } from "@/i18n/format";
import { formatCurrencyINR } from "@/lib/format";
import { simulatePayment } from "@/lib/mock-payment";
import { cn } from "@/lib/utils";
import { createOrder, createReceiptForOrder, decrementProgramSeats } from "@/lib/data-source";
import { useAuth } from "@/store/auth-store";
import { useCart } from "@/store/cart-store";
import type { PaymentMethod } from "@/types";

const METHODS: { value: PaymentMethod; icon: typeof Smartphone }[] = [
  { value: "upi", icon: Smartphone },
  { value: "card", icon: CreditCard },
  { value: "netbanking", icon: Building2 },
];

export default function PaymentPage() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const cart = useCart();

  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paidMethod, setPaidMethod] = useState<PaymentMethod>("upi");
  const [paidItemCount, setPaidItemCount] = useState(0);
  const [failed, setFailed] = useState(false);
  const [devForceFailure, setDevForceFailure] = useState(false);

  // Nothing to pay for — bounce back to Cart. Skipped while a payment is in
  // flight/just succeeded, since clearing the cart on success briefly makes
  // count 0 right before navigating to the receipt.
  useEffect(() => {
    if (cart.isReady && cart.count === 0 && !isProcessing) {
      router.replace("/cart");
    }
  }, [cart.isReady, cart.count, isProcessing, router]);

  if (!profile || (cart.count === 0 && !isProcessing)) return null;

  const methodLabels: Record<PaymentMethod, string> = {
    upi: t.payment.upi,
    card: t.payment.card,
    netbanking: t.payment.netbanking,
  };

  // Minimum time the success overlay stays up, so it's never a flash even
  // when receipt generation (a couple of fast local Payload calls) finishes
  // instantly — the confetti moment needs to actually be seen.
  const MIN_SUCCESS_DISPLAY_MS = 2200;

  async function handlePay() {
    if (!method) return;
    setFailed(false);
    setIsProcessing(true);
    const result = await simulatePayment(method, { forceFailure: devForceFailure });
    if (!result.success) {
      setIsProcessing(false);
      setFailed(true);
      return;
    }
    setPaidAmount(cart.total);
    setPaidMethod(method);
    setPaidItemCount(cart.count);
    setShowSuccess(true);
    try {
      const [receiptId] = await Promise.all([
        (async () => {
          const order = await createOrder({
            userId: profile!.id,
            schoolId: profile!.schoolId,
            items: cart.items,
            totalAmount: cart.total,
            paymentMethod: method,
          });
          await Promise.all(
            order.items.filter((item) => item.kind === "program").map((item) => decrementProgramSeats(item.refId)),
          );
          const receipt = await createReceiptForOrder(order);
          cart.clear();
          return receipt.id;
        })(),
        new Promise((resolve) => setTimeout(resolve, MIN_SUCCESS_DISPLAY_MS)),
      ]);
      router.push(`/receipts/${receiptId}`);
    } catch {
      setShowSuccess(false);
      setIsProcessing(false);
      setFailed(true);
    }
  }

  return (
    <>
      <AppHeader title={t.payment.title} backHref="/cart" showAvatar />
      <div className="w-full space-y-6 p-4 pb-8 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between rounded-lg border border-line/60 bg-card p-4">
          <span className="text-sm text-sub">{t.common.total}</span>
          <span className="font-heading text-xl font-bold text-ink">
            {formatCurrencyINR(cart.total, language)}
          </span>
        </div>

        {failed ? (
          <div className="flex items-start gap-3 rounded-lg border border-section-pay/30 bg-section-pay-bg p-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-section-pay" />
            <div>
              <p className="font-medium text-section-pay">{t.payment.failureTitle}</p>
              <p className="text-sm text-section-pay">{t.payment.failureDescription}</p>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label>{t.payment.methodLabel}</Label>
          <RadioGroup
            value={method}
            onValueChange={(value) => setMethod(value as PaymentMethod)}
            className="gap-2"
          >
            {METHODS.map(({ value, icon: Icon }) => (
              <Label
                key={value}
                htmlFor={`method-${value}`}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 transition-colors",
                  method === value
                    ? "border-brand bg-section-workspace-bg"
                    : "border-line/60 bg-card hover:bg-muted/50",
                )}
              >
                <RadioGroupItem value={value} id={`method-${value}`} />
                <Icon className="size-5 text-sub" />
                <span className="font-medium text-ink">{methodLabels[value]}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-line/60 bg-muted/60 p-3">
          <Checkbox
            id="dev-force-failure"
            checked={devForceFailure}
            onCheckedChange={(checked) => setDevForceFailure(checked === true)}
          />
          <Label htmlFor="dev-force-failure" className="text-xs text-sub">
            {t.payment.devFailureToggle}
          </Label>
        </div>

        <Button className="w-full" disabled={!method || isProcessing} onClick={handlePay}>
          {isProcessing ? t.payment.processing : failed ? t.payment.tryAgain : t.payment.payNow}
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
