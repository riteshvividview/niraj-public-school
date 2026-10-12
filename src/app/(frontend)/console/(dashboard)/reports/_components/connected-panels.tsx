"use client";

import { AlertTriangle, ArrowRight, Headset, PackagePlus, Repeat, Sparkles, Wallet, BookOpenCheck } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useConsoleOverview, useConsoleSchoolId } from "@/lib/hooks/console-data";
import { cn } from "@/lib/utils";

function AttentionTile({ href, icon: Icon, label, count }: { href: string; icon: typeof Repeat; label: string; count: number | undefined }) {
  const hot = (count ?? 0) > 0;
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3.5 transition-colors hover:bg-muted/50",
        hot ? "border-section-programs/40 bg-section-programs-bg/60" : "border-line/60",
      )}
    >
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", hot ? "bg-section-programs text-white" : "bg-muted text-sub")}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        {count === undefined ? <Skeleton className="h-6 w-8" /> : <p className="font-heading text-xl font-bold text-ink">{count}</p>}
        <p className="truncate text-xs text-sub">{label}</p>
      </div>
    </Link>
  );
}

/** Everything across the console that is waiting for a person — each tile opens the tab where it is handled. */
export function NeedsAttentionPanel() {
  const schoolId = useConsoleSchoolId();
  const { data } = useConsoleOverview(schoolId);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Needs attention</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <AttentionTile href="/console/requests?tab=exchange" icon={Repeat} label="Exchange requests" count={data?.requests.exchanges} />
          <AttentionTile href="/console/requests?tab=subject-changes" icon={BookOpenCheck} label="Subject changes" count={data?.requests.subjectChanges} />
          <AttentionTile href="/console/requests?tab=extra-items" icon={PackagePlus} label="Extra item requests" count={data?.requests.extraItems} />
          <AttentionTile href="/console/support" icon={Headset} label="Parent queries" count={data?.requests.support} />
          <AttentionTile href="/console/requests?tab=payment-attempts" icon={AlertTriangle} label="Payments to review" count={data?.paymentsNeedingReview} />
          <AttentionTile href="/console/requests?tab=payment-attempts" icon={Wallet} label="Payments in progress" count={data?.payments30d.pending} />
        </div>
      </CardContent>
    </Card>
  );
}

/** The new features, shown where the school looks at its numbers: new admissions, payment attempts, items still to hand over. */
export function FeaturePanels() {
  const schoolId = useConsoleSchoolId();
  const { data } = useConsoleOverview(schoolId);
  const attempts = data?.payments30d;
  const started = attempts ? attempts.paid + attempts.pending + attempts.failed + attempts.abandoned : 0;
  const conversion = attempts && started > 0 ? Math.round((attempts.paid / started) * 100) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-sub">
            <Sparkles className="size-4" />
            New admissions {data ? `· ${data.newAdmission.academicYear}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!data ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              <p className="font-heading text-2xl font-bold text-ink">{data.newAdmission.newCount}</p>
              <p className="text-sm text-sub">new students this year</p>
              <div className="flex gap-4 text-sm">
                <span className="text-section-essentials">{data.newAdmission.setBoughtCount} bought the full set</span>
                <span className="text-section-programs">{data.newAdmission.waitingCount} still to buy</span>
              </div>
              <Link href="/console/catalogue" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
                Manage new-admission items <ArrowRight className="size-3.5" />
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-sub">
            <Wallet className="size-4" />
            Payment attempts · last 30 days
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!data || !attempts ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              <p className="font-heading text-2xl font-bold text-ink">{conversion === null ? "—" : `${conversion}%`}</p>
              <p className="text-sm text-sub">of started payments completed</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="text-section-essentials">{attempts.paid} paid</span>
                <span className="text-section-programs">{attempts.pending} in progress</span>
                <span className="text-section-pay">{attempts.failed} failed</span>
                <span className="text-sub">{attempts.abandoned} abandoned</span>
              </div>
              <Link href="/console/requests?tab=payment-attempts" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
                Open payment attempts <ArrowRight className="size-3.5" />
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-sub">Book-set items still to hand over</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!data ? (
            <Skeleton className="h-20 w-full" />
          ) : data.outstandingItems.items === 0 ? (
            <p className="text-sm text-sub">Every item in every paid book set has been handed over.</p>
          ) : (
            <>
              <p className="font-heading text-2xl font-bold text-ink">{data.outstandingItems.items}</p>
              <p className="text-sm text-sub">items across {data.outstandingItems.receipts} receipts</p>
              <ul className="space-y-0.5 text-sm">
                {data.outstandingItems.top.slice(0, 5).map((item) => (
                  <li key={item.name} className="flex items-center justify-between gap-3">
                    <span className="truncate text-ink">{item.name}</span>
                    <span className="shrink-0 text-xs text-sub">{item.students} students</span>
                  </li>
                ))}
              </ul>
              <Link href="/console/payments" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
                See receipts <ArrowRight className="size-3.5" />
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
