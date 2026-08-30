"use client";

import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadCsv } from "@/lib/export-utils";
import { formatCurrencyINR, formatDate } from "@/lib/format";
import { useConsoleSchoolId, useProgramReport } from "@/lib/hooks/console-data";

export default function ProgramsReportPage() {
  const schoolId = useConsoleSchoolId();
  const { data: rows } = useProgramReport(schoolId);

  const totals = useMemo(() => {
    if (!rows) return null;
    return rows.reduce(
      (acc, row) => ({
        registrations: acc.registrations + row.registrations,
        checkedIn: acc.checkedIn + row.checkedIn,
        revenue: acc.revenue + row.revenue,
      }),
      { registrations: 0, checkedIn: 0, revenue: 0 },
    );
  }, [rows]);

  function handleExport() {
    const csvRows: (string | number)[][] = [
      ["Program", "Date", "Fee (INR)", "Registrations", "Checked In", "Revenue (INR)", "Seats Remaining"],
    ];
    (rows ?? []).forEach((row) => {
      csvRows.push([row.title, row.date, row.fee, row.registrations, row.checkedIn, row.revenue, row.seatsRemaining ?? ""]);
    });
    downloadCsv(`programs-${new Date().toISOString().slice(0, 10)}.csv`, csvRows);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/console/reports"
        className="inline-flex items-center gap-1.5 text-sm text-sub transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Back to Reports
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Programs &amp; Events</h1>
          <p className="text-sm text-sub">Registrations, check-ins, and revenue for every program the school has posted.</p>
        </div>
        <Button variant="outline" className="gap-2" disabled={!rows?.length} onClick={handleExport}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      {!totals ? (
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="text-xs text-sub">Total registrations</p>
            <p className="font-heading text-2xl font-bold text-ink">{totals.registrations}</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="text-xs text-sub">Checked in</p>
            <p className="font-heading text-2xl font-bold text-ink">{totals.checkedIn}</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="text-xs text-sub">Total revenue</p>
            <p className="font-heading text-2xl font-bold text-ink">{formatCurrencyINR(totals.revenue)}</p>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Registrations</TableHead>
                <TableHead>Checked in</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Seats left</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows ?? []).map((row) => (
                <TableRow key={row.programId}>
                  <TableCell className="font-medium text-ink">{row.title}</TableCell>
                  <TableCell>{formatDate(row.date)}</TableCell>
                  <TableCell>{formatCurrencyINR(row.fee)}</TableCell>
                  <TableCell>{row.registrations}</TableCell>
                  <TableCell>
                    {row.checkedIn > 0 ? <Badge variant="secondary">{row.checkedIn}</Badge> : "—"}
                  </TableCell>
                  <TableCell>{formatCurrencyINR(row.revenue)}</TableCell>
                  <TableCell>{row.seatsRemaining ?? "—"}</TableCell>
                </TableRow>
              ))}
              {rows && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sub">
                    No programs posted yet.
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
