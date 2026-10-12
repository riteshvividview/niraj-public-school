"use client";

import { AlertTriangle, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStockHealthBySchool, type StockHealthRow } from "@/lib/data-source";
import { downloadCsv } from "@/lib/export-utils";
import { useClassLevels, useConsoleSchoolId } from "@/lib/hooks/console-data";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

const ALL_VALUE = "__all__";

function StockChart({ title, rows }: { title: string; rows: StockHealthRow[] }) {
  if (rows.length === 0) return null;
  const height = Math.max(240, rows.length * 32);
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">{title}</p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line)" />
          <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--sub)" />
          <YAxis type="category" dataKey="label" width={200} tick={{ fontSize: 11 }} stroke="var(--sub)" />
          <Tooltip />
          <Legend />
          <Bar dataKey="issuedQuantity" name="Issued" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
          <Bar dataKey="quantityOnHand" name="On hand" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function StockReportPage() {
  const schoolId = useConsoleSchoolId();
  const { classLevels } = useClassLevels(schoolId);
  const [kindFilter, setKindFilter] = useState(ALL_VALUE);
  const [classFilter, setClassFilter] = useState(ALL_VALUE);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 250);

  const { data: stockHealth } = useSWR(schoolId ? ["console:reports:stock-health", schoolId] : null, () =>
    getStockHealthBySchool(schoolId),
  );

  const classLevelById = useMemo(() => new Map(classLevels.map((c) => [c.id, c.label])), [classLevels]);

  const filteredRows = useMemo(() => {
    if (!stockHealth) return null;
    const q = debouncedSearch.trim().toLowerCase();
    return stockHealth.filter((row) => {
      if (kindFilter !== ALL_VALUE && row.kind !== kindFilter) return false;
      if (classFilter !== ALL_VALUE && row.classLevelId !== classFilter) return false;
      if (q && !row.label.toLowerCase().includes(q)) return false;
      if (lowStockOnly && !row.isLow) return false;
      return true;
    });
  }, [stockHealth, kindFilter, classFilter, debouncedSearch, lowStockOnly]);

  const bookRows = useMemo(() => (filteredRows ?? []).filter((r) => r.kind === "book"), [filteredRows]);
  const uniformRows = useMemo(() => (filteredRows ?? []).filter((r) => r.kind === "uniform"), [filteredRows]);
  const lowStockCount = useMemo(() => (filteredRows ?? []).filter((r) => r.isTracked && r.isLow).length, [filteredRows]);

  function handleExport() {
    const rows: (string | number)[][] = [
      ["Item", "Kind", "Class", "Issued Quantity", "Quantity On Hand", "Tracked", "Low Stock"],
    ];
    (filteredRows ?? []).forEach((row) => {
      rows.push([
        row.label,
        row.kind,
        classLevelById.get(row.classLevelId) ?? (row.classLevelId === "" ? "New admission (all classes)" : ""),
        row.issuedQuantity,
        row.quantityOnHand,
        row.isTracked ? "Yes" : "No",
        row.isLow ? "Yes" : "No",
      ]);
    });
    downloadCsv(`stock-health-${new Date().toISOString().slice(0, 10)}.csv`, rows);
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
          <h1 className="font-heading text-2xl font-bold text-ink">Stock Health</h1>
          <p className="text-sm text-sub">Issued quantity vs. current stock on hand, for every tracked book and uniform item.</p>
        </div>
        <Button variant="outline" className="gap-2" disabled={!filteredRows?.length} onClick={handleExport}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3 sm:gap-4">
          <div className="w-full min-w-0 space-y-2 sm:w-auto">
            <Label>Kind</Label>
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All</SelectItem>
                <SelectItem value="book">Books</SelectItem>
                <SelectItem value="uniform">Uniform &amp; Kit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full min-w-0 space-y-2 sm:w-auto">
            <Label>Class</Label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All classes</SelectItem>
                {classLevels.map((level) => (
                  <SelectItem key={level.id} value={level.id}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full min-w-0 flex-1 space-y-2 sm:w-auto">
            <Label>Search</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Product name…" className="w-full sm:w-48" />
          </div>
          <Button
            variant={lowStockOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setLowStockOnly((v) => !v)}
            className="w-full sm:w-auto"
          >
            <AlertTriangle className="size-4" />
            Low stock only {lowStockCount > 0 ? `(${lowStockCount})` : ""}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Issued vs. in-stock, by product</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {!filteredRows ? (
            <Skeleton className="h-64 w-full" />
          ) : filteredRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-sub">No products match these filters.</p>
          ) : (
            <>
              <StockChart title="Books" rows={bookRows} />
              <StockChart title="Uniform & Kit" rows={uniformRows} />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>On hand</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(filteredRows ?? []).map((row) => (
                <TableRow key={`${row.kind}-${row.refId}-${row.variantKey}`}>
                  <TableCell>
                    <p className="font-medium text-ink">{row.label}</p>
                    <p className="text-xs text-sub capitalize">{row.kind}</p>
                  </TableCell>
                  <TableCell>{classLevelById.get(row.classLevelId) ?? (row.classLevelId === "" ? "New admission (all classes)" : "—")}</TableCell>
                  <TableCell>{row.issuedQuantity}</TableCell>
                  <TableCell>{row.quantityOnHand}</TableCell>
                  <TableCell>
                    {!row.isTracked ? (
                      <Badge variant="outline">Not tracked</Badge>
                    ) : row.isLow ? (
                      <Badge variant="destructive">Low stock</Badge>
                    ) : (
                      <Badge variant="secondary">In stock</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredRows && filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sub">
                    No products match these filters.
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
