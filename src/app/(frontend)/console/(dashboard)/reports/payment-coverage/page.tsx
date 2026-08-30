"use client";

import { ArrowLeft, Download } from "lucide-react";
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
import { downloadCsv } from "@/lib/export-utils";
import { useClassLevels, useConsoleSchoolId, usePaymentCoverage } from "@/lib/hooks/console-data";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

const ALL_VALUE = "__all__";

const COVERAGE_LABELS: Record<EssentialsCoverage, string> = {
  both: "Books + Uniform",
  booksOnly: "Books only",
  uniformOnly: "Uniform only",
  neither: "Neither yet",
};

const COVERAGE_TILES: { value: EssentialsCoverage; label: string }[] = [
  { value: "both", label: "Paid both" },
  { value: "booksOnly", label: "Books only" },
  { value: "uniformOnly", label: "Uniform only" },
  { value: "neither", label: "Neither yet" },
];

export default function PaymentCoveragePage() {
  const schoolId = useConsoleSchoolId();
  const { classLevels } = useClassLevels(schoolId);
  const [classFilter, setClassFilter] = useState(ALL_VALUE);
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

  const filteredStudents = useMemo(() => {
    if (!coverage) return null;
    const q = debouncedSearch.trim().toLowerCase();
    return coverage.students.filter((student) => {
      if (classFilter !== ALL_VALUE && student.classLevelId !== classFilter) return false;
      if (coverageFilter !== ALL_VALUE && student.essentialsCoverage !== coverageFilter) return false;
      if (q && !student.name.toLowerCase().includes(q) && !student.registerNumber.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [coverage, classFilter, coverageFilter, debouncedSearch]);

  function handleExport() {
    const rows: (string | number)[][] = [
      ["Name", "Register Number", "Class", "Section", "Mobile Number", "Paid Books", "Paid Uniform", "Coverage"],
    ];
    (filteredStudents ?? []).forEach((student) => {
      rows.push([
        student.name,
        student.registerNumber,
        classLabelById.get(student.classLevelId) ?? "",
        student.section ?? "",
        student.mobileNumber ?? "",
        student.hasPaidBooks ? "Yes" : "No",
        student.hasPaidUniform ? "Yes" : "No",
        COVERAGE_LABELS[student.essentialsCoverage],
      ]);
    });
    downloadCsv(`payment-coverage-${new Date().toISOString().slice(0, 10)}.csv`, rows);
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
        <Button variant="outline" className="gap-2" disabled={!filteredStudents?.length} onClick={handleExport}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By class — paid for anything</CardTitle>
        </CardHeader>
        <CardContent>
          {!coverage || !totals ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink">All classes</span>
                <span className="text-sub">
                  {totals.paid} / {totals.total} paid
                </span>
              </div>
              {coverage.byClass.map((row) => {
                const pct = row.totalCount > 0 ? Math.round((row.paidCount / row.totalCount) * 100) : 0;
                return (
                  <div key={row.classLevelId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink">{row.classLabel}</span>
                      <span className="text-sub">
                        {row.paidCount} / {row.totalCount}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${pct < 70 ? "bg-destructive" : "bg-brand"}`}
                        style={{ width: `${pct}%` }}
                      />
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
            <p className="text-xs text-sub">{tile.label}</p>
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
              <Select value={classFilter} onValueChange={setClassFilter}>
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
            {coverageFilter !== ALL_VALUE || classFilter !== ALL_VALUE || search.trim() !== "" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCoverageFilter(ALL_VALUE);
                  setClassFilter(ALL_VALUE);
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
                    <TableHead>Books</TableHead>
                    <TableHead>Uniform</TableHead>
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
                      <TableCell>
                        {student.hasPaidBooks ? <Badge variant="secondary">Paid</Badge> : <Badge variant="outline">—</Badge>}
                      </TableCell>
                      <TableCell>
                        {student.hasPaidUniform ? <Badge variant="secondary">Paid</Badge> : <Badge variant="outline">—</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sub">
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
