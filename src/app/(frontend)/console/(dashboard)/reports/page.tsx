"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsoleStatSkeleton } from "@/components/shared/console-list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { groupItemsByKind } from "@/lib/cart-items";
import { getReceiptsBySchool, getSchools } from "@/lib/data-source";
import type { ReceiptRecord } from "@/types";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs text-sub">{label}</p>
      <p className="font-heading text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

export default function ReportsPage() {
  const [records, setRecords] = useState<ReceiptRecord[] | null>(null);

  useEffect(() => {
    getSchools().then((schools) => {
      if (schools.length > 0) getReceiptsBySchool(schools[0].id).then(setRecords);
      else setRecords([]);
    });
  }, []);

  const stats = useMemo(() => {
    const list = records ?? [];
    const totalRevenue = list.reduce((sum, r) => sum + r.order.totalAmount, 0);
    const redeemed = list.filter((r) => r.receipt.redemptionStatus !== "ready").length;
    const pending = list.length - redeemed;

    const categoryRevenue = {
      books: 0,
      uniform: 0,
      stationery: 0,
      programs: 0,
    };
    list.forEach((r) => {
      const grouped = groupItemsByKind(r.order.items);
      categoryRevenue.books += grouped.books.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      categoryRevenue.uniform += grouped.uniform.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      categoryRevenue.stationery += grouped.stationery.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      categoryRevenue.programs += grouped.programs.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    });

    return {
      totalRevenue,
      redeemed,
      pending,
      categoryRevenue,
      totalOrders: list.length,
    };
  }, [records]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Reports Dashboard</h1>
        <p className="text-sm text-sub">
          Payments received vs. items collected / attendees checked in. For the full
          payment ledger and CSV export, see the Payments page.
        </p>
      </div>

      {records === null ? (
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
          {records === null ? (
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
