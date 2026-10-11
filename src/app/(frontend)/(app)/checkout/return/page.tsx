"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { PaymentAttemptCard } from "@/components/shared/payment-attempt-card";
import { PaymentSuccessOverlay } from "@/components/shared/payment-success-overlay";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/context";
import { formatTemplate } from "@/i18n/format";
import { checkPaymentStatus } from "@/lib/data-source";
import { formatCurrencyINR } from "@/lib/format";
import { useAuth } from "@/store/auth-store";
import { useCart } from "@/store/cart-store";
import type { PaymentAttempt, PaymentMethod } from "@/types";

const MIN_SUCCESS_DISPLAY_MS = 2200;
/** How long to keep asking the bank before telling the parent to check My payments (they can always come back). */
const POLL_EVERY_MS = 2500;
const POLL_TIMES = 10;

/**
 * Where the bank's payment page sends the parent back to. It never trusts the
 * browser's say-so: it asks the server, which asks the bank. Paid → receipt;
 * still pending → keep asking for a short while, then point to My payments.
 */
function ReturnFromBank() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const { profile } = useAuth();
  const cart = useCart();
  const paymentId = params.get("payment");
  const [payment, setPayment] = useState<PaymentAttempt | null>(null);
  const [checking, setChecking] = useState(true);
  const [failed, setFailed] = useState(false);
  const [paid, setPaid] = useState<PaymentAttempt | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!profile || !paymentId || started.current) return;
    started.current = true;
    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < POLL_TIMES && !cancelled; attempt++) {
        try {
          const updated = await checkPaymentStatus(paymentId);
          if (cancelled) return;
          setPayment(updated);
          if (updated.status === "paid") {
            setPaid(updated);
            await new Promise((resolve) => setTimeout(resolve, MIN_SUCCESS_DISPLAY_MS));
            cart.clear();
            router.replace(updated.receipt ? `/receipts/${updated.receipt.id}` : "/receipts");
            return;
          }
          if (updated.status !== "pending") {
            setFailed(true);
            break;
          }
          // A declined attempt stays "pending" (the parent can retry) but carries the reason — no point waiting.
          if (updated.failureReason) break;
        } catch {
          /* keep trying — a hiccup shouldn't strand the parent */
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_EVERY_MS));
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
      started.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, paymentId]);

  if (!profile) return null;

  return (
    <>
      <AppHeader title={t.payment.title} showAvatar />
      <div className="w-full space-y-5 p-4 pb-8 sm:p-6 lg:p-8">
        {checking && !failed ? (
          <div className="flex items-center gap-3 rounded-lg border border-line/60 bg-card p-4 text-sm text-ink">
            <Loader2 className="size-5 animate-spin text-brand" />
            {t.payment.confirming}
          </div>
        ) : null}

        {!checking || failed ? (
          <>
            {failed ? (
              <p className="rounded-lg border border-section-pay/30 bg-section-pay-bg p-4 text-sm text-section-pay">{t.payment.failureDescription}</p>
            ) : (
              <div className="space-y-1 rounded-lg border border-section-programs/30 bg-section-programs-bg p-4">
                <p className="font-medium text-section-programs">{t.payment.notConfirmedTitle}</p>
                <p className="text-sm text-section-programs">{t.payment.notConfirmedDescription}</p>
              </div>
            )}
            {payment ? (
              <PaymentAttemptCard
                payment={payment}
                onChanged={setPayment}
                onSettled={(updated) => router.replace(updated.receipt ? `/receipts/${updated.receipt.id}` : "/receipts")}
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/checkout/payment">{t.payment.tryAgain}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/payments">{t.payment.myPayments}</Link>
              </Button>
            </div>
          </>
        ) : null}
      </div>

      {paid ? (
        <PaymentSuccessOverlay
          title={t.payment.successTitle}
          description={t.payment.successDescription}
          amountLabel={formatCurrencyINR(paid.amount, language)}
          methodRowLabel={t.payment.methodLabel}
          paymentMethodLabel={
            (
              { upi: t.payment.upi, card: t.payment.card, netbanking: t.payment.netbanking, other: t.payment.other } as Record<string, string>
            )[(paid.method as PaymentMethod) ?? "other"] ?? t.payment.other
          }
          itemsRowLabel={t.payment.itemsLabel}
          itemsLabel={formatTemplate(t.essentials.itemsCount, { n: paid.items.length })}
        />
      ) : null}
    </>
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense fallback={null}>
      <ReturnFromBank />
    </Suspense>
  );
}
