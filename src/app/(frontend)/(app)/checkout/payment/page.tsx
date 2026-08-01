"use client";

import { AlertTriangle, Building2, CreditCard, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTranslation } from "@/i18n/context";
import { formatCurrencyINR } from "@/lib/format";
import { simulatePayment } from "@/lib/mock-payment";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";
import { useCart } from "@/store/cart-store";
import { useReceipts } from "@/store/receipts-store";
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
  const receipts = useReceipts();

  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [isProcessing, setIsProcessing] = useState(false);
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

  if (!profile || cart.count === 0) return null;

  const methodLabels: Record<PaymentMethod, string> = {
    upi: t.payment.upi,
    card: t.payment.card,
    netbanking: t.payment.netbanking,
  };

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
    const record = receipts.createOrder({
      userId: profile!.id,
      schoolId: profile!.schoolId,
      items: cart.items,
      totalAmount: cart.total,
      paymentMethod: method,
    });
    cart.clear();
    router.push(`/receipts/${record.receipt.id}`);
  }

  return (
    <>
      <AppHeader title={t.payment.title} backHref="/cart" />
      <div className="mx-auto w-full max-w-2xl space-y-6 p-4 pb-8 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between rounded-2xl border border-line bg-card p-4">
          <span className="text-sm text-sub">{t.common.total}</span>
          <span className="font-heading text-xl font-bold text-ink">
            {formatCurrencyINR(cart.total, language)}
          </span>
        </div>

        {failed ? (
          <div className="flex items-start gap-3 rounded-2xl border border-section-pay bg-section-pay-bg p-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-section-pay" />
            <div>
              <p className="font-medium text-section-pay">{t.payment.failureTitle}</p>
              <p className="text-sm text-section-pay">{t.payment.failureDescription}</p>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label>{t.payment.methodLabel}</Label>
          <RadioGroup value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
            {METHODS.map(({ value, icon: Icon }) => (
              <Label
                key={value}
                htmlFor={`method-${value}`}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-2xl border p-4",
                  method === value ? "border-brand bg-section-workspace-bg" : "border-line bg-card",
                )}
              >
                <RadioGroupItem value={value} id={`method-${value}`} />
                <Icon className="size-5 text-sub" />
                <span className="font-medium text-ink">{methodLabels[value]}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-line p-3">
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
    </>
  );
}
