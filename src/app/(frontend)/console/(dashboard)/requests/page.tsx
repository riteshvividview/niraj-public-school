"use client";

import { Suspense } from "react";
import { Wallet, BookOpenCheck, PackagePlus, Repeat } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useConsoleOverview,
  useConsoleSchoolId,
  usePendingBookChangeCount,
  usePendingExchangeCount,
  usePendingExtraItemCount,
} from "@/lib/hooks/console-data";
import { cn } from "@/lib/utils";
import { ExchangeRequestsTab } from "./_tabs/exchange-requests-tab";
import { ExtraItemRequestsTab } from "./_tabs/extra-item-requests-tab";
import { PaymentAttemptsTab } from "./_tabs/payment-attempts-tab";
import { SubjectChangeRequestsTab } from "./_tabs/subject-change-requests-tab";

type TabKey = "exchange" | "extra-items" | "subject-changes" | "payment-attempts";

/**
 * The less-used, request-style screens in one place so the sidebar stays short:
 * uniform exchanges, extra-item requests, subject changes, and payment attempts.
 * Each tab is the same screen it always was; the number on a tab is what is waiting.
 * The tab lives in the address (?tab=…) so links, refreshes and the old URLs all land on the right one.
 */
function RequestsHub() {
  const router = useRouter();
  const params = useSearchParams();
  const schoolId = useConsoleSchoolId();
  const exchanges = usePendingExchangeCount(schoolId);
  const subjectChanges = usePendingBookChangeCount(schoolId);
  const extraItems = usePendingExtraItemCount(schoolId);
  const { data: overview } = useConsoleOverview(schoolId);

  const tabs: Array<{ key: TabKey; label: string; icon: typeof Repeat; count: number }> = [
    { key: "exchange", label: "Exchange", icon: Repeat, count: exchanges },
    { key: "extra-items", label: "Extra Items", icon: PackagePlus, count: extraItems },
    { key: "subject-changes", label: "Subject Changes", icon: BookOpenCheck, count: subjectChanges },
    { key: "payment-attempts", label: "Payment Attempts", icon: Wallet, count: overview?.paymentsNeedingReview ?? 0 },
  ];
  const requested = params.get("tab");
  const active: TabKey = tabs.some((t) => t.key === requested) ? (requested as TabKey) : "exchange";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Requests</h1>
        <p className="text-sm text-sub">Exchanges, extra uniform items, subject changes and payment attempts — everything waiting on a decision, in one place.</p>
      </div>

      {/* A tidy 2×2 grid on a phone, one row from sm up. */}
      <div>
        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl border border-line/60 bg-muted/40 p-1 sm:flex sm:w-full">
          {tabs.map(({ key, label, icon: Icon, count }) => {
            const selected = key === active;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={selected}
                type="button"
                onClick={() => router.replace(`/console/requests?tab=${key}`, { scroll: false })}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3.5 sm:whitespace-nowrap",
                  selected ? "bg-section-console text-white shadow-sm" : "text-sub hover:bg-card hover:text-ink",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
                {count > 0 ? (
                  <span className={cn("flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold", selected ? "bg-white/25 text-white" : "bg-destructive text-white")}>
                    {count > 9 ? "9+" : count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {active === "exchange" ? <ExchangeRequestsTab /> : null}
      {active === "extra-items" ? <ExtraItemRequestsTab /> : null}
      {active === "subject-changes" ? <SubjectChangeRequestsTab /> : null}
      {active === "payment-attempts" ? <PaymentAttemptsTab /> : null}
    </div>
  );
}

export default function RequestsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <RequestsHub />
    </Suspense>
  );
}
