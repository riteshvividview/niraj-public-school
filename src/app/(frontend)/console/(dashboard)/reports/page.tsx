"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsoleStatSkeleton } from "@/components/shared/console-list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { getReceiptStatsBySchool } from "@/lib/data-source";
import { useConsoleSchoolId } from "@/lib/hooks/console-data";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs text-sub">{label}</p>
      <p className="font-heading text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

export default function ReportsPage() {
  const schoolId = useConsoleSchoolId();
  const { data: stats } = useSWR(schoolId ? ["console:receipt-stats", schoolId] : null, () =>
    getReceiptStatsBySchool(schoolId),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Reports Dashboard</h1>
        <p className="text-sm text-sub">
          Payments received vs. items collected / attendees checked in. For the full
          payment ledger and CSV export, see the Payments page.
        </p>
      </div>

      {!stats ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <ConsoleStatSkeleton />
          <ConsoleStatSkeleton />
          <ConsoleStatSkeleton />
          <ConsoleStatSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Total orders" value={String(stats.totalOrders)} />
          <StatTile label="Total revenue" value={`₹${stats.totalRevenue.toLocaleString("en-IN")}`} />
          <StatTile label="Collected / checked in" value={String(stats.redeemed)} />
          <StatTile label="Awaiting collection" value={String(stats.pending)} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Revenue by category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!stats ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            (
              [
                ["Books", stats.categoryRevenue.books],
                ["Uniform & Kit", stats.categoryRevenue.uniform],
                ["Stationery", stats.categoryRevenue.stationery],
                ["Programs & Events", stats.categoryRevenue.programs],
              ] as const
            ).map(([label, amount]) => {
              const pct = stats.totalRevenue > 0 ? Math.round((amount / stats.totalRevenue) * 100) : 0;
              return (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink">{label}</span>
                    <span className="text-sub">₹{amount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
