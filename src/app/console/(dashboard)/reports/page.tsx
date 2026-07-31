"use client";

import { Download } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { groupItemsByKind } from "@/lib/cart-items";
import { useReceipts } from "@/store/receipts-store";

const SCHOOL_ID = "school-niraj";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs text-sub">{label}</p>
      <p className="font-heading text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

function toCsv(rows: string[][]): string {
  return rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export default function ReportsPage() {
  const receipts = useReceipts();
  const records = receipts.getBySchool(SCHOOL_ID);

  const stats = useMemo(() => {
    const totalRevenue = records.reduce((sum, r) => sum + r.order.totalAmount, 0);
    const redeemed = records.filter((r) => r.receipt.redemptionStatus !== "ready").length;
    const pending = records.length - redeemed;

    const categoryRevenue = { books: 0, uniform: 0, stationery: 0, programs: 0 };
    records.forEach((r) => {
      const grouped = groupItemsByKind(r.order.items);
      categoryRevenue.books += grouped.books.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      categoryRevenue.uniform += grouped.uniform.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      categoryRevenue.stationery += grouped.stationery.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      categoryRevenue.programs += grouped.programs.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    });

    return { totalRevenue, redeemed, pending, categoryRevenue, totalOrders: records.length };
  }, [records]);

  function handleExport() {
    const rows: string[][] = [
      ["Receipt ID", "Order ID", "Date", "Amount (INR)", "Payment Method", "Order Status", "Redemption Status"],
      ...records.map((r) => [
        r.receipt.id,
        r.order.id,
        r.receipt.issuedAt,
        String(r.order.totalAmount),
        r.order.paymentMethod,
        r.order.status,
        r.receipt.redemptionStatus,
      ]),
    ];
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `niraj-public-school-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Reports Dashboard</h1>
          <p className="text-sm text-sub">Payments received vs. items collected / attendees checked in.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Total orders" value={String(stats.totalOrders)} />
        <StatTile label="Total revenue" value={`₹${stats.totalRevenue.toLocaleString("en-IN")}`} />
        <StatTile label="Collected / checked in" value={String(stats.redeemed)} />
        <StatTile label="Awaiting collection" value={String(stats.pending)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(
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
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Redemption</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.receipt.id}>
                  <TableCell>{r.receipt.id}</TableCell>
                  <TableCell>{new Date(r.receipt.issuedAt).toLocaleDateString("en-IN")}</TableCell>
                  <TableCell>₹{r.order.totalAmount}</TableCell>
                  <TableCell className="uppercase">{r.order.paymentMethod}</TableCell>
                  <TableCell className="capitalize">{r.receipt.redemptionStatus.replace("-", " ")}</TableCell>
                </TableRow>
              ))}
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sub">
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
