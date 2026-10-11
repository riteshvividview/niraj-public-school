"use client";

import { Clock } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/context";
import { formatTemplate } from "@/i18n/format";
import { getMyPayments } from "@/lib/data-source";
import { formatCurrencyINR } from "@/lib/format";
import { useAuth } from "@/store/auth-store";

/**
 * Shown wherever a parent might be tempted to pay again (Cart, Receipts): if a
 * payment of theirs is still in progress, say so and send them to check it. The
 * list call re-checks the in-progress payment with the provider, so this also
 * turns into "Paid" on its own once the bank confirms.
 */
export function PendingPaymentBanner() {
  const { t, language } = useTranslation();
  const { profile } = useAuth();
  const { data } = useSWR(profile ? ["my-payments", profile.id] : null, () => getMyPayments(), {
    refreshInterval: (latest) => (latest?.some((payment) => payment.status === "pending") ? 15_000 : 0),
  });
  const pending = data?.find((payment) => payment.status === "pending");
  if (!pending) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-section-programs/30 bg-section-programs-bg p-4">
      <Clock className="mt-0.5 size-5 shrink-0 text-section-programs" />
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="font-medium text-section-programs">{t.payment.pendingTitle}</p>
          <p className="text-sm text-section-programs">{formatTemplate(t.payment.pendingDescription, { amount: formatCurrencyINR(pending.amount, language) })}</p>
        </div>
        <Button asChild size="sm">
          <Link href="/payments">{t.payment.checkStatus}</Link>
        </Button>
      </div>
    </div>
  );
}
