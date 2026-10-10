"use client";

import { ArrowLeft, BookOpen, Download, IndianRupee, Shirt } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type EssentialsCoverage } from "@/lib/data-source";
import { formatAddress } from "@/lib/address";
import { downloadCsv } from "@/lib/export-utils";
import { formatCurrencyINR } from "@/lib/format";
import { useClassLevels, useConsoleSchoolId, usePaymentCoverage } from "@/lib/hooks/console-data";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

const ALL_VALUE = "__all__";

const COVERAGE_LABELS: Record<EssentialsCoverage, string> = {
  both: "Books + Uniform",
  booksOnly: "Books only",
  uniformOnly: "Uniform only",
  neither: "Neither yet",
};

const COVERAGE_TILES: { value: EssentialsCoverage; label: string; dotClassName: string }[] = [
  { value: "both", label: "Paid both", dotClassName: "bg-brand-2" },
  { value: "booksOnly", label: "Books only", dotClassName: "bg-warm" },
  { value: "uniformOnly", label: "Uniform only", dotClassName: "bg-warm" },
  { value: "neither", label: "Neither yet", dotClassName: "bg-destructive" },
];

export default function PaymentCoveragePage() {
  const schoolId = useConsoleSchoolId();
  const { classLevels } = useClassLevels(schoolId);
  const [classFilter, setClassFilter] = useState(ALL_VALUE);
  const [sectionFilter, setSectionFilter] = useState(ALL_VALUE);
  const [coverageFilter, setCoverageFilter] = useState<EssentialsCoverage | typeof ALL_VALUE>(ALL_VALUE);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);

  const { data: coverage } = usePaymentCoverage(schoolId);

  const classLabelById = useMemo(() => new Map(classLevels.map((c) => [c.id, c.label])), [classLevels]);

  const totals = useMemo(() => {
    if (!coverage) return null;
    return coverage.byClass.reduce((acc, row) => ({ paid: acc.paid + row.paidCount, total: acc.total + row.totalCount }), {
      paid: 0,
      total: 0,
    });
  }, [coverage]);

  // Essentials-coverage counts respect the class filter (so "Books only" reads
  // as "in the selected class" when one's chosen) but not search — search only
  // narrows the table below.
  const coverageCounts = useMemo(() => {
    const counts: Record<EssentialsCoverage, number> = { both: 0, booksOnly: 0, uniformOnly: 0, neither: 0 };
    if (!coverage) return counts;
    for (const student of coverage.students) {
      if (classFilter !== ALL_VALUE && student.classLevelId !== classFilter) continue;
      counts[student.essentialsCoverage] += 1;
    }
    return counts;
  }, [coverage, classFilter]);

  // Scoped to the selected class (if any) so the dropdown never offers a
  // section that doesn't exist in that class.
  const availableSections = useMemo(() => {
    if (!coverage) return [];
    const set = new Set<string>();
    for (const student of coverage.students) {
      if (classFilter !== ALL_VALUE && student.classLevelId !== classFilter) continue;
      if (student.section) set.add(student.section);
    }
    return Array.from(set).sort();
  }, [coverage, classFilter]);

  const filteredStudents = useMemo(() => {
    if (!coverage) return null;
    const q = debouncedSearch.trim().toLowerCase();
    return coverage.students.filter((student) => {
      if (classFilter !== ALL_VALUE && student.classLevelId !== classFilter) return false;
      if (sectionFilter !== ALL_VALUE && student.section !== sectionFilter) return false;
      if (coverageFilter !== ALL_VALUE && student.essentialsCoverage !== coverageFilter) return false;
      if (q && !student.name.toLowerCase().includes(q) && !student.registerNumber.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [coverage, classFilter, sectionFilter, coverageFilter, debouncedSearch]);

  function handleExportStudents() {
    const rows: (string | number)[][] = [
      [
        "Name",
        "Register Number",
        "Class",
        "Section",
        "Mobile Number",
        "Delivery Address",
        "Paid Books",
        "Paid Uniform",
        "Coverage",
        "Books Paid",
        "Uniform Paid",
        "Total Paid",
        "Estimated Books Cost",
        "Estimated Uniform Cost",
        "Outstanding Amount",
      ],
    ];
    (filteredStudents ?? []).forEach((student) => {
      rows.push([
        student.name,
        student.registerNumber,
        classLabelById.get(student.classLevelId) ?? "",
        student.section ?? "",
        student.mobileNumber ?? "",
        formatAddress(student.address),
        student.hasPaidBooks ? "Yes" : "No",
        student.hasPaidUniform ? "Yes" : "No",
        COVERAGE_LABELS[student.essentialsCoverage],
        student.actualBooksRevenue,
        student.actualUniformRevenue,
        student.actualTotalRevenue,
        student.estimatedBooksCost,
        student.estimatedUniformCost,
        student.outstandingAmount,
      ]);
    });
    downloadCsv(`payment-coverage-students-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  function handleExportByClass() {
    if (!coverage) return;
    const rows: (string | number)[][] = [
      ["Class", "Paid Count", "Total Count", "Actual Revenue", "Potential Revenue", "Outstanding Revenue"],
    ];
    const classRows =
      classFilter === ALL_VALUE ? coverage.byClass : coverage.byClass.filter((row) => row.classLevelId === classFilter);
    classRows.forEach((row) => {
      rows.push([row.classLabel, row.paidCount, row.totalCount, row.actualRevenue, row.potentialRevenue, row.outstandingRevenue]);
    });
    const classTotals = classRows.reduce(
      (acc, row) => ({
        paid: acc.paid + row.paidCount,
        total: acc.total + row.totalCount,
        actual: acc.actual + row.actualRevenue,
        potential: acc.potential + row.potentialRevenue,
        outstanding: acc.outstanding + row.outstandingRevenue,
      }),
      { paid: 0, total: 0, actual: 0, potential: 0, outstanding: 0 },
    );
    rows.push([
      classFilter === ALL_VALUE ? "All Classes" : "Selected Class",
      classTotals.paid,
      classTotals.total,
      classTotals.actual,
      classTotals.potential,
      classTotals.outstanding,
    ]);
    downloadCsv(`payment-coverage-by-class-${new Date().toISOString().slice(0, 10)}.csv`, rows);
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
          <h1 className="font-heading text-2xl font-bold text-ink">Payment Coverage</h1>
          <p className="text-sm text-sub">
            Who&apos;s paid, and for what — Books, Uniform & Kit, both, or neither yet (programs aren&apos;t counted
            here). A whole-roster view, not scoped to a date range.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" disabled={!coverage} onClick={handleExportByClass}>
            <Download className="size-4" />
            Export by Class
          </Button>
          <Button variant="outline" className="gap-2" disabled={!filteredStudents?.length} onClick={handleExportStudents}>
            <Download className="size-4" />
            Export Students
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          {!coverage ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="flex items-start gap-3 pb-4 sm:pb-0 sm:pr-5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                    <IndianRupee className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs text-sub">Actual revenue</p>
                    <p className="font-heading text-2xl font-bold text-ink">{formatCurrencyINR(coverage.summary.totalActualRevenue)}</p>
                    <p className="text-xs text-sub">Books + Uniform collected so far</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 py-4 sm:px-5 sm:py-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-2/10 text-brand-2">
                    <IndianRupee className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs text-sub">Potential revenue</p>
                    <p className="font-heading text-2xl font-bold text-ink">{formatCurrencyINR(coverage.summary.totalPotentialRevenue)}</p>
                    <p className="text-xs text-sub">If every student paid, at today&apos;s prices</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 pt-4 sm:pt-0 sm:pl-5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warm/10 text-warm">
                    <IndianRupee className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs text-sub">Outstanding (est.)</p>
                    <p className="font-heading text-2xl font-bold text-warm">{formatCurrencyINR(coverage.summary.totalOutstandingRevenue)}</p>
                    <p className="text-xs text-sub">Estimated cost of what&apos;s unpaid</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{
                    width: `${coverage.summary.totalPotentialRevenue > 0 ? Math.round((coverage.summary.totalActualRevenue / coverage.summary.totalPotentialRevenue) * 100) : 0}%`,
                  }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(
          [
            { label: "Books", Icon: BookOpen, actual: coverage?.summary.booksActualRevenue, outstanding: coverage?.summary.booksOutstandingRevenue },
            { label: "Uniform & Kit", Icon: Shirt, actual: coverage?.summary.uniformActualRevenue, outstanding: coverage?.summary.uniformOutstandingRevenue },
          ] as const
        ).map(({ label, Icon, actual, outstanding }) => {
          const potential = (actual ?? 0) + (outstanding ?? 0);
          const pct = potential > 0 ? Math.round(((actual ?? 0) / potential) * 100) : 0;
          return (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-ink">
                  <Icon className="size-4 text-sub" />
                  {label}
                </div>
                {!coverage ? (
                  <Skeleton className="mt-2 h-14 w-full" />
                ) : (
                  <>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="font-heading text-xl font-bold text-ink">{formatCurrencyINR(actual ?? 0)}</span>
                      <span className="text-xs text-sub">collected</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-sub">
                      {formatCurrencyINR(outstanding ?? 0)} outstanding (est.) of {formatCurrencyINR(potential)} potential
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By class — paid for anything</CardTitle>
        </CardHeader>
        <CardContent>
          {!coverage || !totals ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
                <span className="font-heading font-semibold text-ink">All classes</span>
                <span className="font-medium text-ink">
                  {totals.paid} / {totals.total} paid
                </span>
              </div>
              {coverage.byClass.map((row) => {
                const pct = row.totalCount > 0 ? Math.round((row.paidCount / row.totalCount) * 100) : 0;
                return (
                  <div key={row.classLevelId} className="space-y-1.5 rounded-lg border border-line/60 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">{row.classLabel}</span>
                      <span className="text-sub">{row.paidCount} / {row.totalCount} paid</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${pct < 70 ? "bg-destructive" : "bg-brand"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 text-xs text-sub">
                      <span>{formatCurrencyINR(row.actualRevenue)} collected</span>
                      {row.outstandingRevenue > 0 ? (
                        <span className="text-warm">{formatCurrencyINR(row.outstandingRevenue)} outstanding (est.)</span>
                      ) : (
                        <span className="text-brand-2">Fully collected</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {COVERAGE_TILES.map((tile) => (
          <button
            key={tile.value}
            type="button"
            onClick={() => setCoverageFilter(coverageFilter === tile.value ? ALL_VALUE : tile.value)}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              coverageFilter === tile.value ? "border-brand bg-brand/5" : "border-line bg-card hover:border-brand/40"
            }`}
          >
            <p className="flex items-center gap-1.5 text-xs text-sub">
              <span className={`size-1.5 rounded-full ${tile.dotClassName}`} />
              {tile.label}
            </p>
            <p className="font-heading text-2xl font-bold text-ink">{coverage ? coverageCounts[tile.value] : "—"}</p>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1 space-y-1.5">
              <Label className="text-xs text-sub">Search</Label>
              <Input placeholder="Name or register number" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="w-40 space-y-1.5">
              <Label className="text-xs text-sub">Class</Label>
              <Select
                value={classFilter}
                onValueChange={(v) => {
                  setClassFilter(v);
                  setSectionFilter(ALL_VALUE);
                }}
              >
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
            <div className="w-36 space-y-1.5">
              <Label className="text-xs text-sub">Section</Label>
              <Select value={sectionFilter} onValueChange={setSectionFilter} disabled={availableSections.length === 0}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All Sections</SelectItem>
                  {availableSections.map((section) => (
                    <SelectItem key={section} value={section}>
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-44 space-y-1.5">
              <Label className="text-xs text-sub">Coverage</Label>
              <Select value={coverageFilter} onValueChange={(v) => setCoverageFilter(v as EssentialsCoverage | typeof ALL_VALUE)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All</SelectItem>
                  {COVERAGE_TILES.map((tile) => (
                    <SelectItem key={tile.value} value={tile.value}>
                      {tile.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {coverageFilter !== ALL_VALUE || classFilter !== ALL_VALUE || sectionFilter !== ALL_VALUE || search.trim() !== "" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCoverageFilter(ALL_VALUE);
                  setClassFilter(ALL_VALUE);
                  setSectionFilter(ALL_VALUE);
                  setSearch("");
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>

          {filteredStudents !== null ? (
            <p className="text-sm text-sub">{filteredStudents.length} students</p>
          ) : null}

          {!filteredStudents ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Register Number</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Books</TableHead>
                    <TableHead>Uniform</TableHead>
                    <TableHead>Total Paid</TableHead>
                    <TableHead>Outstanding (est.)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium text-ink">{student.name}</TableCell>
                      <TableCell>{student.registerNumber}</TableCell>
                      <TableCell>{classLabelById.get(student.classLevelId) ?? "—"}</TableCell>
                      <TableCell>{student.section ?? "—"}</TableCell>
                      <TableCell>{student.mobileNumber ?? "—"}</TableCell>
                      <TableCell className="max-w-56 truncate" title={formatAddress(student.address)}>
                        {formatAddress(student.address) || "—"}
                      </TableCell>
                      <TableCell>
                        {student.hasPaidBooks ? (
                          <Badge variant="secondary">{formatCurrencyINR(student.actualBooksRevenue)}</Badge>
                        ) : (
                          <Badge variant="outline">—</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.hasPaidUniform ? (
                          <Badge variant="secondary">{formatCurrencyINR(student.actualUniformRevenue)}</Badge>
                        ) : (
                          <Badge variant="outline">—</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-ink">{formatCurrencyINR(student.actualTotalRevenue)}</TableCell>
                      <TableCell className={student.outstandingAmount > 0 ? "text-warm" : "text-sub"}>
                        {formatCurrencyINR(student.outstandingAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-sub">
                        No students match this filter.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
