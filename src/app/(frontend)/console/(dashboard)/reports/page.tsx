"use client";

import { ArrowRight, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import useSWR from "swr";
import { ConsoleListSkeleton, ConsoleStatSkeleton } from "@/components/shared/console-list-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStockHealthBySchool } from "@/lib/data-source";
import { downloadWorkbook } from "@/lib/export-utils";
import { formatCurrencyINR } from "@/lib/format";
import {
  useClassLevels,
  useConsoleSchoolId,
  usePaymentCoverage,
  useProgramReport,
  useSchoolPayments,
} from "@/lib/hooks/console-data";
import {
  classBreakdownOf,
  collectionStatusOf,
  daysSince,
  oldestPendingOf,
  overviewOf,
  paymentMethodBreakdownOf,
  revenueTrendOf,
  type ReportFilter,
} from "@/lib/reports-aggregate";

const ALL_VALUE = "__all__";
const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];
const PENDING_COLOR = "var(--destructive)";

const CATEGORY_LABELS = { books: "Books", uniform: "Uniform & Kit", programs: "Programs & Events" } as const;
const METHOD_LABELS = { upi: "UPI", card: "Card", netbanking: "Net Banking" } as const;

function StatTile({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <div className="rounded-2xl border border-line bg-card p-4 transition-colors hover:border-brand/40">
      <p className="text-xs text-sub">{label}</p>
      <p className="font-heading text-2xl font-bold text-ink">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

interface Filters {
  fromDate: string;
  toDate: string;
  classLevelId: string;
}

const EMPTY_FILTERS: Filters = { fromDate: "", toDate: "", classLevelId: ALL_VALUE };

function ordersHref(params: {
  status?: "collected" | "pending";
  classLevelId?: string;
  fromDate?: string;
  toDate?: string;
  sort?: "oldest";
}): string {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.classLevelId) search.set("classLevelId", params.classLevelId);
  if (params.fromDate) search.set("fromDate", params.fromDate);
  if (params.toDate) search.set("toDate", params.toDate);
  if (params.sort) search.set("sort", params.sort);
  const qs = search.toString();
  return `/console/reports/orders${qs ? `?${qs}` : ""}`;
}

export default function ReportsPage() {
  const schoolId = useConsoleSchoolId();
  const { classLevels } = useClassLevels(schoolId);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [isExporting, setIsExporting] = useState(false);

  const filter: ReportFilter = useMemo(
    () => ({
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
      classLevelId: filters.classLevelId !== ALL_VALUE ? filters.classLevelId : undefined,
    }),
    [filters.fromDate, filters.toDate, filters.classLevelId],
  );
  const hasActiveFilters = filters.fromDate !== "" || filters.toDate !== "" || filters.classLevelId !== ALL_VALUE;

  // Fetched once per school, every payment-derived chart/tile below is a pure
  // client-side derivation (see src/lib/reports-aggregate.ts) — filtering is
  // instant recomputation, not a new network round-trip.
  const payments = useSchoolPayments(schoolId);
  const { data: stockHealth } = useSWR(schoolId ? ["console:reports:stock-health", schoolId] : null, () =>
    getStockHealthBySchool(schoolId),
  );
  const { data: paymentCoverage } = usePaymentCoverage(schoolId);
  const { data: programReport } = useProgramReport(schoolId, filter);

  const overview = useMemo(() => (payments ? overviewOf(payments, filter) : null), [payments, filter]);
  const classBreakdown = useMemo(
    () => (payments ? classBreakdownOf(payments, classLevels, filter) : null),
    [payments, classLevels, filter],
  );
  const collectionStatus = useMemo(() => (payments ? collectionStatusOf(payments, filter) : null), [payments, filter]);
  const revenueTrend = useMemo(() => (payments ? revenueTrendOf(payments, filter) : null), [payments, filter]);
  const paymentMethods = useMemo(
    () => (payments ? paymentMethodBreakdownOf(payments, filter) : null),
    [payments, filter],
  );
  const oldestPending = useMemo(() => (payments ? oldestPendingOf(payments, filter, 5) : null), [payments, filter]);

  const filteredStockHealth = useMemo(() => {
    if (!stockHealth) return null;
    return filters.classLevelId === ALL_VALUE
      ? stockHealth
      : stockHealth.filter((row) => row.classLevelId === filters.classLevelId);
  }, [stockHealth, filters.classLevelId]);

  const topIssuedItems = useMemo(
    () => (filteredStockHealth ?? []).slice().sort((a, b) => b.issuedQuantity - a.issuedQuantity).slice(0, 6),
    [filteredStockHealth],
  );
  const lowStockItems = useMemo(
    () => (filteredStockHealth ?? []).filter((row) => row.isTracked && row.isLow),
    [filteredStockHealth],
  );

  const coverageTotals = useMemo(() => {
    if (!paymentCoverage) return null;
    const relevant =
      filters.classLevelId === ALL_VALUE
        ? paymentCoverage.byClass
        : paymentCoverage.byClass.filter((row) => row.classLevelId === filters.classLevelId);
    return relevant.reduce((acc, row) => ({ paid: acc.paid + row.paidCount, total: acc.total + row.totalCount }), {
      paid: 0,
      total: 0,
    });
  }, [paymentCoverage, filters.classLevelId]);

  const programTotals = useMemo(() => {
    if (!programReport) return null;
    return programReport.reduce(
      (acc, row) => ({ registrations: acc.registrations + row.registrations, revenue: acc.revenue + row.revenue }),
      { registrations: 0, revenue: 0 },
    );
  }, [programReport]);

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  async function handleExportFullReport() {
    setIsExporting(true);
    try {
      const sheets = [
        {
          name: "Overview",
          rows: [
            ["Metric", "Value"],
            ["Total orders", overview?.ordersCount ?? 0],
            ["Total revenue (INR)", overview?.revenue ?? 0],
            ["Average order value (INR)", overview?.avgOrderValue ?? 0],
            ["Collected / checked in", overview?.collected ?? 0],
            ["Awaiting collection", overview?.pending ?? 0],
          ],
        },
        {
          name: "Class Breakdown",
          rows: [
            ["Class", "Orders", "Revenue (INR)", "Collected", "Pending"],
            ...(classBreakdown ?? []).map((row) => [row.classLabel, row.ordersCount, row.revenue, row.collected, row.pending]),
          ],
        },
        {
          name: "Collection Status",
          rows: [
            ["Category", "Collected value (INR)", "Pending value (INR)"],
            ...(collectionStatus ?? []).map((row) => [CATEGORY_LABELS[row.category], row.collectedValue, row.pendingValue]),
          ],
        },
        {
          name: "Payment Methods",
          rows: [
            ["Method", "Revenue (INR)", "Orders"],
            ...(paymentMethods ?? []).map((row) => [METHOD_LABELS[row.method], row.revenue, row.count]),
          ],
        },
        {
          name: "Stock Health",
          rows: [
            ["Item", "Kind", "Issued Quantity", "Quantity On Hand", "Tracked", "Low Stock"],
            ...(filteredStockHealth ?? []).map((row) => [
              row.label,
              row.kind,
              row.issuedQuantity,
              row.quantityOnHand,
              row.isTracked ? "Yes" : "No",
              row.isLow ? "Yes" : "No",
            ]),
          ],
        },
        {
          name: "Programs",
          rows: [
            ["Program", "Date", "Fee (INR)", "Registrations", "Checked In", "Revenue (INR)", "Seats Remaining"],
            ...(programReport ?? []).map((row) => [
              row.title,
              row.date,
              row.fee,
              row.registrations,
              row.checkedIn,
              row.revenue,
              row.seatsRemaining ?? "",
            ]),
          ],
        },
        {
          name: "Payment Coverage",
          rows: [
            ["Class", "Paid", "Total Students"],
            ...(paymentCoverage?.byClass ?? []).map((row) => [row.classLabel, row.paidCount, row.totalCount]),
          ],
        },
        {
          name: "Revenue Trend",
          rows: [["Date", "Revenue (INR)", "Orders"], ...(revenueTrend ?? []).map((p) => [p.date, p.revenue, p.orders])],
        },
      ];
      const suffix = filters.fromDate || filters.toDate ? `-${filters.fromDate || "start"}-to-${filters.toDate || "now"}` : "";
      downloadWorkbook(`reports${suffix}-${new Date().toISOString().slice(0, 10)}.xlsx`, sheets);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Reports Dashboard</h1>
          <p className="text-sm text-sub">
            Payments, collection status, stock health, and program registrations across the school — filter, drill
            in, then export.
          </p>
        </div>
        <Button variant="outline" className="gap-2" disabled={isExporting} onClick={handleExportFullReport}>
          <FileSpreadsheet className="size-4" />
          Export full report (.xlsx)
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="w-40 space-y-1.5">
            <Label htmlFor="reports-from" className="text-xs text-sub">
              From
            </Label>
            <Input id="reports-from" type="date" value={filters.fromDate} onChange={(e) => set("fromDate", e.target.value)} />
          </div>
          <div className="w-40 space-y-1.5">
            <Label htmlFor="reports-to" className="text-xs text-sub">
              To
            </Label>
            <Input id="reports-to" type="date" value={filters.toDate} onChange={(e) => set("toDate", e.target.value)} />
          </div>
          <div className="w-40 space-y-1.5">
            <Label className="text-xs text-sub">Class</Label>
            <Select value={filters.classLevelId} onValueChange={(v) => set("classLevelId", v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All Classes</SelectItem>
                {classLevels.map((level) => (
                  <SelectItem key={level.id} value={level.id}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters ? (
            <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear filters
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {!overview ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <ConsoleStatSkeleton />
          <ConsoleStatSkeleton />
          <ConsoleStatSkeleton />
          <ConsoleStatSkeleton />
          <ConsoleStatSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatTile
            label="Total orders"
            value={String(overview.ordersCount)}
            href={ordersHref({ classLevelId: filter.classLevelId, fromDate: filter.fromDate, toDate: filter.toDate })}
          />
          <StatTile label="Total revenue" value={formatCurrencyINR(overview.revenue)} />
          <StatTile label="Avg. order value" value={formatCurrencyINR(overview.avgOrderValue)} />
          <StatTile
            label="Collected / checked in"
            value={String(overview.collected)}
            href={ordersHref({
              status: "collected",
              classLevelId: filter.classLevelId,
              fromDate: filter.fromDate,
              toDate: filter.toDate,
            })}
          />
          <StatTile
            label="Awaiting collection"
            value={String(overview.pending)}
            href={ordersHref({
              status: "pending",
              classLevelId: filter.classLevelId,
              fromDate: filter.fromDate,
              toDate: filter.toDate,
            })}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-sub">Payment coverage</CardTitle>
          </CardHeader>
          <CardContent>
            {!coverageTotals ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <p className="font-heading text-2xl font-bold text-ink">
                  {coverageTotals.paid} <span className="text-sm font-normal text-sub">/ {coverageTotals.total} paid</span>
                </p>
                <Link href="/console/reports/payment-coverage" className="mt-2 inline-flex items-center gap-1 text-sm text-brand hover:underline">
                  View payment coverage <ArrowRight className="size-3.5" />
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-sub">Programs &amp; Events</CardTitle>
          </CardHeader>
          <CardContent>
            {!programTotals ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <p className="font-heading text-2xl font-bold text-ink">{programTotals.registrations} registrations</p>
                <p className="text-xs text-sub">{formatCurrencyINR(programTotals.revenue)} revenue</p>
                <Link href="/console/reports/programs" className="mt-2 inline-flex items-center gap-1 text-sm text-brand hover:underline">
                  View programs report <ArrowRight className="size-3.5" />
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-sub">Payment methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {!paymentMethods ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              paymentMethods.map((row) => (
                <div key={row.method} className="flex items-center justify-between text-sm">
                  <span className="text-sub">{METHOD_LABELS[row.method]}</span>
                  <span className="font-medium text-ink">{formatCurrencyINR(row.revenue)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by category</CardTitle>
          </CardHeader>
          <CardContent>
            {!collectionStatus ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={collectionStatus.map((row) => ({
                      name: CATEGORY_LABELS[row.category],
                      value: row.collectedValue + row.pendingValue,
                    }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {collectionStatus.map((row, i) => (
                      <Cell key={row.category} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrencyINR(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collection status by category</CardTitle>
          </CardHeader>
          <CardContent>
            {!collectionStatus ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={collectionStatus.map((row) => ({ name: CATEGORY_LABELS[row.category], ...row }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--sub)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--sub)" />
                  <Tooltip formatter={(value) => formatCurrencyINR(Number(value))} />
                  <Legend />
                  <Bar dataKey="collectedValue" name="Collected" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pendingValue" name="Pending" fill={PENDING_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue &amp; orders trend</CardTitle>
        </CardHeader>
        <CardContent>
          {!revenueTrend ? (
            <Skeleton className="h-64 w-full" />
          ) : revenueTrend.length === 0 ? (
            <p className="py-10 text-center text-sm text-sub">No payments in this range yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--sub)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--sub)" />
                <Tooltip
                  formatter={(value, name) => (name === "Revenue" ? formatCurrencyINR(Number(value)) : String(value))}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="orders" name="Orders" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Class / section breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!classBreakdown ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={classBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="classLabel" tick={{ fontSize: 12 }} stroke="var(--sub)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--sub)" />
                  <Tooltip formatter={(value) => formatCurrencyINR(Number(value))} />
                  <Bar dataKey="revenue" name="Revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead>Pending</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classBreakdown.map((row) => (
                      <TableRow
                        key={row.classLevelId}
                        className="cursor-pointer hover:bg-muted"
                        onClick={() =>
                          (window.location.href = ordersHref({
                            classLevelId: row.classLevelId,
                            fromDate: filter.fromDate,
                            toDate: filter.toDate,
                          }))
                        }
                      >
                        <TableCell className="font-medium text-brand hover:underline">{row.classLabel}</TableCell>
                        <TableCell>{row.ordersCount}</TableCell>
                        <TableCell>{formatCurrencyINR(row.revenue)}</TableCell>
                        <TableCell>{row.collected}</TableCell>
                        <TableCell>{row.pending > 0 ? <Badge variant="destructive">{row.pending}</Badge> : "—"}</TableCell>
                      </TableRow>
                    ))}
                    {classBreakdown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sub">
                          No data for this filter.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              Issued vs. in-stock
              {lowStockItems.length > 0 ? <Badge variant="destructive">{lowStockItems.length} low</Badge> : null}
            </CardTitle>
            <Link href="/console/reports/stock" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
              View full stock report <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredStockHealth ? (
            <Skeleton className="h-64 w-full" />
          ) : topIssuedItems.length === 0 ? (
            <p className="py-10 text-center text-sm text-sub">No stock data for this filter.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topIssuedItems} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line)" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--sub)" />
                <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 11 }} stroke="var(--sub)" />
                <Tooltip />
                <Legend />
                <Bar dataKey="issuedQuantity" name="Issued" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="quantityOnHand" name="On hand" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Oldest pending</CardTitle>
            <Link
              href={ordersHref({ status: "pending", classLevelId: filter.classLevelId, fromDate: filter.fromDate, toDate: filter.toDate, sort: "oldest" })}
              className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
            >
              View all awaiting collection <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {!oldestPending ? (
            <ConsoleListSkeleton rows={3} />
          ) : oldestPending.length === 0 ? (
            <p className="py-6 text-center text-sm text-sub">Nothing awaiting collection for this filter.</p>
          ) : (
            <div className="space-y-2">
              {oldestPending.map((record) => (
                <div
                  key={record.receipt.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line/60 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{record.studentName}</p>
                    <p className="text-xs text-sub">{record.registerNumber}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium text-ink">{formatCurrencyINR(record.order.totalAmount)}</p>
                    <p className="text-xs text-destructive">{daysSince(record.receipt.issuedAt)}d pending</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
