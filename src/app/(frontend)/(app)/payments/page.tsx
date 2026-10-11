"use client";

import { Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PaymentAttemptCard } from "@/components/shared/payment-attempt-card";
import { useTranslation } from "@/i18n/context";
import { getMyPayments } from "@/lib/data-source";
import { useAuth } from "@/store/auth-store";

/**
 * "My payments" — the page a parent opens when the screen died mid-payment. Every
 * attempt with its real status; the one in progress is re-checked with the payment
 * provider each time this loads (and every 10 seconds while it is pending), so a
 * payment that went through shows up as Paid with its receipt.
 */
export default function MyPaymentsPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const router = useRouter();
  const { data, mutate } = useSWR(profile ? ["my-payments", profile.id] : null, () => getMyPayments(), {
    refreshInterval: (latest) => (latest?.some((payment) => payment.status === "pending") ? 10_000 : 0),
    revalidateOnFocus: true,
  });

  if (!profile) return null;

  return (
    <>
      <AppHeader title={t.paymentsPage.title} backHref="/receipts" showAvatar />
      <div className="w-full space-y-4 p-4 pb-8 sm:p-6 lg:p-8">
        <p className="text-sm text-sub">{t.paymentsPage.subtitle}</p>
        {data === undefined ? null : data.length === 0 ? (
          <EmptyState icon={Wallet} title={t.paymentsPage.emptyTitle} description={t.paymentsPage.emptyDescription} />
        ) : (
          <div className="space-y-3">
            {data.map((payment) => (
              <PaymentAttemptCard
                key={payment.id}
                payment={payment}
                onChanged={() => mutate()}
                onSettled={(updated) => (updated.receipt ? router.push(`/receipts/${updated.receipt.id}`) : undefined)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
