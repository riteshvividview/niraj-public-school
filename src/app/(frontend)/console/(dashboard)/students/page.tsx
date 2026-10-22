"use client";

import { AddressInline } from "@/components/console/address-display";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  GraduationCap,
  Loader2,
  Plus,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import useSWR, { preload, useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClassLevelSelect } from "@/components/shared/class-level-select";
import { ConsoleListSkeleton } from "@/components/shared/console-list-skeleton";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  downloadSampleWorkbook,
  OPTIONAL_FIELDS,
  parseElective,
  parseLanguageCell,
  parseStream,
  parseStudentsFile,
  REQUIRED_FIELDS,
  SAMPLE_HEADERS,
  type ParsedStudentRow,
} from "@/lib/bulk-import";
import {
  bulkCreateStudents,
  createStudent,
  getStudentSectionsBySchool,
  getStudentsPageBySchool,
  type BulkCreateResult,
  type CreateStudentInput,
  type StudentPageFilters,
} from "@/lib/data-source";
import {
  classLevelsCacheUpdater,
  useClassLevels,
  useConsoleSchoolId,
  useNewAdmissionInfo,
} from "@/lib/hooks/console-data";
import { cn } from "@/lib/utils";
import { oppositeLanguage } from "@/lib/academic-language";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  deriveLanguage,
  ELECTIVE_OPTIONS,
  electiveLabel,
  firstLanguageOf,
  LANGUAGE_OPTIONS,
  LanguageAndSpecializationFields,
  NewAdmissionBadge,
  secondLanguageOf,
  STREAM_OPTIONS,
} from "./_components/student-shared";
import { EMPTY_ADDRESS_DRAFT, resolveAddressDraft, StaffAddressSection } from "./_components/staff-address-section";
import { PromoteClassDialog } from "./_components/promote-class-dialog";
import type { AcademicLanguage, ClassLevel, Elective, Stream, UserProfile } from "@/types";

// --- Add student ------------------------------------------------------------

function AddStudentForm({
  schoolId,
  classLevels,
  onClassLevelsChange,
  onDone,
}: {
  schoolId: string;
  classLevels: ClassLevel[];
  onClassLevelsChange: (levels: ClassLevel[]) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [password, setPassword] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [classLevelId, setClassLevelId] = useState(classLevels[0]?.id ?? "");
  const [section, setSection] = useState("");
  const [gender, setGender] = useState<UserProfile["gender"] | "">("");
  const [firstLanguage, setFirstLanguage] = useState<AcademicLanguage | "">("");
  const [secondLanguage, setSecondLanguage] = useState<AcademicLanguage | "">("");
  const [stream, setStream] = useState<Stream | "">("");
  const [elective, setElective] = useState<Elective | "">("");
  const [address, setAddress] = useState(EMPTY_ADDRESS_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !registerNumber.trim() || !password || !classLevelId)
      return;
    const resolvedAddress = resolveAddressDraft(address, false);
    if (!resolvedAddress.ok) {
      setError(resolvedAddress.error);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await createStudent({
        name: name.trim(),
        registerNumber: registerNumber.trim(),
        password,
        mobileNumber: mobileNumber.trim() || undefined,
        email: email.trim() || undefined,
        role: "student",
        schoolId,
        classLevelId,
        section: section.trim() || undefined,
        gender: gender || undefined,
        stream: stream || undefined,
        elective: elective || undefined,
        address: resolvedAddress.address ?? undefined,
        ...deriveLanguage(firstLanguage, secondLanguage),
      });
      toast.success("Student added");
      onDone();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't create this student.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="student-name">Name</Label>
        <Input
          id="student-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="student-register-number">Register number</Label>
          <Input
            id="student-register-number"
            value={registerNumber}
            onChange={(e) => setRegisterNumber(e.target.value)}
            placeholder="e.g. NPS2026001"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="student-password">Password</Label>
          <Input
            id="student-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Class</Label>
          <ClassLevelSelect
            schoolId={schoolId}
            classLevels={classLevels}
            value={classLevelId}
            onChange={setClassLevelId}
            onClassLevelsChange={onClassLevelsChange}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="student-section">Section (optional)</Label>
          <Input
            id="student-section"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="e.g. A"
          />
        </div>
        <div className="space-y-2">
          <Label>Gender (optional)</Label>
          <Select
            value={gender || undefined}
            onValueChange={(value) => setGender(value as UserProfile["gender"])}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="student-mobile">Mobile number (optional)</Label>
          <Input
            id="student-mobile"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="student-email">Email (optional)</Label>
          <Input
            id="student-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="For order/OTP notifications"
          />
        </div>
      </div>
      <LanguageAndSpecializationFields
        firstLanguage={firstLanguage}
        setFirstLanguage={setFirstLanguage}
        secondLanguage={secondLanguage}
        setSecondLanguage={setSecondLanguage}
        stream={stream}
        setStream={setStream}
        elective={elective}
        setElective={setElective}
      />
      <StaffAddressSection draft={address} onChange={setAddress} idPrefix="student-address" />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Add Student
        </Button>
      </DialogFooter>
    </form>
  );
}

// --- Bulk upload ------------------------------------------------------------

interface ResolvedRow extends ParsedStudentRow {
  classLevelId?: string;
  issue?: string;
}

const ROMAN_NUMERALS: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
  xi: 11,
  xii: 12,
};

/**
 * Normalizes a class label for matching regardless of a roster's own naming
 * convention — "Class II", "Grade 2", "class-2", "2" should all match a
 * ClassLevel labeled "Class 2". Strips "class"/"grade" words, then converts
 * a trailing Roman numeral (I–XII) to its digit form.
 */
function normalizeClassLabel(label: string): string {
  const stripped = label
    .toLowerCase()
    .replace(/\bclass\b|\bgrade\b/g, "")
    .trim();
  const romanValue = ROMAN_NUMERALS[stripped];
  return romanValue !== undefined ? String(romanValue) : stripped;
}

function resolveRows(
  rows: ParsedStudentRow[],
  classLevels: ClassLevel[],
): ResolvedRow[] {
  return rows.map((row) => {
    if (!row.name || !row.registerNumber) {
      return { ...row, issue: "Missing name or register number" };
    }
    const match = row.className
      ? classLevels.find(
          (level) => normalizeClassLabel(level.label) === normalizeClassLabel(row.className!),
        )
      : undefined;
    if (row.className && !match) {
      return { ...row, issue: `No class matching "${row.className}"` };
    }
    return { ...row, classLevelId: match?.id ?? classLevels[0]?.id };
  });
}

function BulkUploadForm({
  schoolId,
  classLevels,
  onDone,
}: {
  schoolId: string;
  classLevels: ClassLevel[];
  onDone: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ResolvedRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [results, setResults] = useState<BulkCreateResult[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    setResults(null);
    try {
      const parsed = await parseStudentsFile(file);
      setRows(resolveRows(parsed, classLevels));
    } catch (err) {
      setRows(null);
      setParseError(
        err instanceof Error ? err.message : "Couldn't read that file.",
      );
    }
  }

  const validRows = (rows ?? []).filter((row) => !row.issue);

  async function handleImport() {
    setIsImporting(true);
    const inputs: CreateStudentInput[] = validRows.map((row) => {
      const { languageLevel, academicLanguage } = parseLanguageCell(row.academicLanguage);
      return {
        name: row.name,
        registerNumber: row.registerNumber,
        password:
          row.password && row.password.length >= 8
            ? row.password
            : row.registerNumber,
        mobileNumber: row.mobileNumber,
        email: row.email,
        role: "student",
        schoolId,
        classLevelId: row.classLevelId!,
        section: row.section,
        languageLevel,
        academicLanguage,
        stream: parseStream(row.stream),
        elective: parseElective(row.elective),
      };
    });
    const outcome = await bulkCreateStudents(inputs);
    setResults(outcome);
    setIsImporting(false);
    const succeeded = outcome.filter((r) => r.ok).length;
    toast.success(`${succeeded} student${succeeded === 1 ? "" : "s"} imported`);
  }

  if (results) {
    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.length - succeeded;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-muted p-4">
          <CheckCircle2 className="size-5 shrink-0 text-section-essentials" />
          <p className="text-sm text-ink">
            {succeeded} student{succeeded === 1 ? "" : "s"} imported
            {failed ? `, ${failed} failed` : ""}.
          </p>
        </div>
        {failed ? (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-line p-3 text-sm">
            {results
              .filter((r) => !r.ok)
              .map((r) => (
                <p key={r.row} className="text-destructive">
                  Row {r.row} ({r.registerNumber || "—"}): {r.error}
                </p>
              ))}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={onDone}>
            Done
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-2xl border border-line bg-muted/60 p-3.5 text-sm">
        <p>
          <span className="font-medium text-ink">Required columns:</span>{" "}
          {REQUIRED_FIELDS.map((f) => SAMPLE_HEADERS[f]).join(", ")}
        </p>
        <p>
          <span className="font-medium text-ink">Optional columns:</span>{" "}
          {OPTIONAL_FIELDS.map((f) => SAMPLE_HEADERS[f]).join(", ")}
        </p>
        <p className="text-xs text-sub">
          Rows without a password default to using the register number as the password.
        </p>
      </div>

      <Button type="button" variant="outline" className="w-full gap-2" onClick={downloadSampleWorkbook}>
        <Download className="size-4" />
        Download Sample File
      </Button>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line p-8 text-center transition-colors hover:border-brand/50 hover:bg-muted"
      >
        <Upload className="size-6 text-sub" />
        <span className="text-sm font-medium text-ink">
          {fileName ?? "Click to choose a file, or drag one here"}
        </span>
        <span className="text-xs text-sub">CSV, XLSX, XLS, ODS, or JSON</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.ods,.json"
        className="sr-only"
        onChange={handleFileChange}
      />

      {parseError ? (
        <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {parseError}
        </div>
      ) : null}

      {rows ? (
        <div className="space-y-2">
          <p className="text-sm text-ink">
            {rows.length} row{rows.length === 1 ? "" : "s"} found —{" "}
            {validRows.length} ready to import
            {rows.length - validRows.length
              ? `, ${rows.length - validRows.length} with issues`
              : ""}
            .
          </p>
          <div className="max-h-56 overflow-x-auto overflow-y-auto rounded-2xl border border-line">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Register #</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Stream</TableHead>
                  <TableHead>Elective</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.name || "—"}</TableCell>
                    <TableCell>{row.registerNumber || "—"}</TableCell>
                    <TableCell>{row.className || "—"}</TableCell>
                    <TableCell>{row.section || "—"}</TableCell>
                    <TableCell>{row.academicLanguage || "—"}</TableCell>
                    <TableCell>{row.stream || "—"}</TableCell>
                    <TableCell>{row.elective || "—"}</TableCell>
                    <TableCell
                      className={
                        row.issue
                          ? "text-destructive"
                          : "text-section-essentials"
                      }
                    >
                      {row.issue ?? "Ready"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      <DialogFooter>
        <Button
          type="button"
          disabled={!validRows.length || isImporting}
          onClick={handleImport}
        >
          {isImporting ? <Loader2 className="size-4 animate-spin" /> : null}
          Import{" "}
          {validRows.length
            ? `${validRows.length} Student${validRows.length === 1 ? "" : "s"}`
            : ""}
        </Button>
      </DialogFooter>
    </div>
  );
}

// --- Page --------------------------------------------------------------

const ALL_VALUE = "__all__";

interface StudentFilters {
  search: string;
  classLevelId: string;
  section: string;
  gender: string;
  firstLanguage: string;
  secondLanguage: string;
  stream: string;
  elective: string;
}

const EMPTY_FILTERS: StudentFilters = {
  search: "",
  classLevelId: ALL_VALUE,
  section: ALL_VALUE,
  gender: ALL_VALUE,
  firstLanguage: ALL_VALUE,
  secondLanguage: ALL_VALUE,
  stream: ALL_VALUE,
  elective: ALL_VALUE,
};

function StudentFilterBar({
  filters,
  setFilters,
  classLevels,
  sections,
}: {
  filters: StudentFilters;
  setFilters: (filters: StudentFilters) => void;
  classLevels: ClassLevel[];
  sections: string[];
}) {
  function set<K extends keyof StudentFilters>(key: K, value: StudentFilters[K]) {
    setFilters({ ...filters, [key]: value });
  }

  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => key !== "search" && value !== ALL_VALUE).length;
  const hasActiveFilters = filters.search.trim() !== "" || activeFilterCount > 0;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1 space-y-1.5">
        <Label htmlFor="student-search" className="text-xs text-sub">
          Search
        </Label>
        <Input
          id="student-search"
          placeholder="Name or register number"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
        />
      </div>
      {/* On a phone the seven filters sit behind one button instead of filling the screen. */}
      <Button type="button" variant="outline" className="md:hidden" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
        Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
      </Button>
      <div className={cn("w-full flex-wrap items-end gap-3", showFilters ? "flex" : "hidden", "md:contents")}>
      <div className="w-36 space-y-1.5">
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
      <div className="w-32 space-y-1.5">
        <Label className="text-xs text-sub">Section</Label>
        <Select value={filters.section} onValueChange={(v) => set("section", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Sections</SelectItem>
            {sections.map((section) => (
              <SelectItem key={section} value={section}>
                {section}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-32 space-y-1.5">
        <Label className="text-xs text-sub">Gender</Label>
        <Select value={filters.gender} onValueChange={(v) => set("gender", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Genders</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="w-40 space-y-1.5">
        <Label className="text-xs text-sub">First Language</Label>
        <Select
          value={filters.firstLanguage}
          onValueChange={(v) => {
            // Same rule as the Add/Edit forms — first/second are always
            // opposites, so picking one forces the other, never a match.
            const opposite = v === ALL_VALUE ? ALL_VALUE : oppositeLanguage(v as AcademicLanguage);
            setFilters({ ...filters, firstLanguage: v, secondLanguage: opposite });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All</SelectItem>
            {LANGUAGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-40 space-y-1.5">
        <Label className="text-xs text-sub">Second Language</Label>
        <Select
          value={filters.secondLanguage}
          onValueChange={(v) => {
            const opposite = v === ALL_VALUE ? ALL_VALUE : oppositeLanguage(v as AcademicLanguage);
            setFilters({ ...filters, secondLanguage: v, firstLanguage: opposite });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All</SelectItem>
            {LANGUAGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-40 space-y-1.5">
        <Label className="text-xs text-sub">Specialization 1</Label>
        <Select value={filters.stream} onValueChange={(v) => set("stream", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All</SelectItem>
            {STREAM_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-40 space-y-1.5">
        <Label className="text-xs text-sub">Specialization 2</Label>
        <Select value={filters.elective} onValueChange={(v) => set("elective", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All</SelectItem>
            {ELECTIVE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      </div>
      {hasActiveFilters ? (
        <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

function StudentRow({ student, classLabel }: { student: UserProfile; classLabel: string }) {
  const newAdmissionInfo = useNewAdmissionInfo(student.schoolId);
  const { mutate } = useSWRConfig();
  const firstLang = firstLanguageOf(student);
  const secondLang = secondLanguageOf(student);
  return (
    <Link
      href={`/console/students/${student.id}`}
      onClick={() => {
        // We already have this student's full profile right here in the list
        // row — hand it to the detail page's cache so it can render instantly
        // instead of showing a loading skeleton while it re-fetches the same data.
        mutate(["console:student", student.id], student, { revalidate: false });
      }}
      className="flex items-center gap-3 rounded-xl border border-line/60 bg-card p-3.5 transition-colors hover:border-brand/40 hover:bg-muted/40"
    >
      <UserAvatar name={student.name} avatarUrl={student.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{student.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-sub">
          <span>{student.registerNumber}</span>
          <NewAdmissionBadge student={student} info={newAdmissionInfo} />
          <span>·</span>
          <span>{classLabel}</span>
          {student.section ? (
            <>
              <span>·</span>
              <span>Sec {student.section}</span>
            </>
          ) : null}
          {firstLang ? (
            <>
              <span>·</span>
              <span className="capitalize">{firstLang}</span>
            </>
          ) : null}
          {secondLang ? (
            <>
              <span>·</span>
              <span className="capitalize">{secondLang} (2nd)</span>
            </>
          ) : null}
          {student.stream ? (
            <>
              <span>·</span>
              <span className="capitalize">{student.stream}</span>
            </>
          ) : null}
          {student.elective ? (
            <>
              <span>·</span>
              <span>{electiveLabel(student.elective)}</span>
            </>
          ) : null}
        </div>
        <AddressInline address={student.address} className="mt-1" />
      </div>
      <ChevronRight className="size-4 shrink-0 text-sub" />
    </Link>
  );
}

const PAGE_SIZE = 20;

export default function StudentsManagerPage() {
  const schoolId = useConsoleSchoolId();
  const { classLevels, mutateClassLevels } = useClassLevels(schoolId);
  const [filters, setFilters] = useState<StudentFilters>(EMPTY_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const [page, setPage] = useState(1);

  const queryFilters: StudentPageFilters = {
    search: debouncedSearch.trim() || undefined,
    classLevelId: filters.classLevelId !== ALL_VALUE ? filters.classLevelId : undefined,
    section: filters.section !== ALL_VALUE ? filters.section : undefined,
    gender: filters.gender !== ALL_VALUE ? (filters.gender as UserProfile["gender"]) : undefined,
    firstLanguage: filters.firstLanguage !== ALL_VALUE ? (filters.firstLanguage as AcademicLanguage) : undefined,
    secondLanguage: filters.secondLanguage !== ALL_VALUE ? (filters.secondLanguage as AcademicLanguage) : undefined,
    stream: filters.stream !== ALL_VALUE ? (filters.stream as Stream) : undefined,
    elective: filters.elective !== ALL_VALUE ? (filters.elective as Elective) : undefined,
  };

  // Reset to page 1 whenever the effective query changes — an in-render
  // state adjustment (not an effect) so it can't fire an extra render cycle.
  const filtersKey = JSON.stringify(queryFilters);
  const [seenFiltersKey, setSeenFiltersKey] = useState(filtersKey);
  if (filtersKey !== seenFiltersKey) {
    setSeenFiltersKey(filtersKey);
    setPage(1);
  }
  const effectivePage = filtersKey === seenFiltersKey ? page : 1;

  const {
    data: pageData,
    isValidating: studentsValidating,
    mutate: mutateStudents,
  } = useSWR(
    schoolId ? ["console:students", schoolId, filtersKey, effectivePage] : null,
    () => getStudentsPageBySchool(schoolId, queryFilters, effectivePage, PAGE_SIZE),
    { keepPreviousData: true },
  );
  const { data: sections = [] } = useSWR(
    schoolId ? ["console:student-sections", schoolId] : null,
    () => getStudentSectionsBySchool(schoolId),
  );

  // Warm the cache for the next page in the background so hitting "Next"
  // usually shows data immediately instead of waiting on a fresh request.
  useEffect(() => {
    if (!schoolId || !pageData || effectivePage >= pageData.totalPages) return;
    const nextPage = effectivePage + 1;
    preload(["console:students", schoolId, filtersKey, nextPage], () =>
      getStudentsPageBySchool(schoolId, queryFilters, nextPage, PAGE_SIZE),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, filtersKey, effectivePage, pageData?.totalPages]);

  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const { mutate: refreshAll } = useSWRConfig();

  const onClassLevelsChange = classLevelsCacheUpdater(mutateClassLevels);

  const classLabelById = new Map(
    classLevels.map((level) => [level.id, level.label]),
  );

  const students = pageData?.students ?? null;
  const totalCount = pageData?.totalCount ?? 0;
  const totalPages = pageData?.totalPages ?? 1;
  const hasActiveFilters =
    filters.search.trim() !== "" ||
    Object.entries(filters).some(([key, value]) => key !== "search" && value !== ALL_VALUE);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Students</h1>
          <p className="text-sm text-sub">
            Add students one at a time, or bulk-import a class list from a
            spreadsheet. Click a student to see their full record. Only
            students added here can log in.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            disabled={!schoolId}
            onClick={() => setPromoteOpen(true)}
          >
            <GraduationCap className="size-4" />
            Promote Class
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!schoolId}
            onClick={() => setBulkOpen(true)}
          >
            <Upload className="size-4" />
            Bulk Upload
          </Button>
          <Button
            className="gap-2"
            disabled={!schoolId}
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-4" />
            Add Student
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StudentFilterBar
            filters={filters}
            setFilters={setFilters}
            classLevels={classLevels}
            sections={sections}
          />
          {students !== null ? (
            <p className="text-sm text-sub">
              {totalCount === 0
                ? "0 students"
                : `${(effectivePage - 1) * PAGE_SIZE + 1}–${Math.min(effectivePage * PAGE_SIZE, totalCount)} of ${totalCount} students`}
            </p>
          ) : null}
          {students === null ? (
            <ConsoleListSkeleton />
          ) : students.length === 0 ? (
            <p className="rounded-xl border border-line/60 py-10 text-center text-sm text-sub">
              {!hasActiveFilters
                ? "No students yet — add one or bulk-upload a class list."
                : "No students match these filters."}
            </p>
          ) : (
            <div
              className={`space-y-2 transition-opacity ${studentsValidating ? "opacity-60" : ""}`}
            >
              {students.map((student) => (
                <StudentRow
                  key={student.id}
                  student={student}
                  classLabel={classLabelById.get(student.classLevelId) ?? "—"}
                />
              ))}
            </div>
          )}
          {students !== null && totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={effectivePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <p className="text-xs text-sub">
                Page {effectivePage} of {totalPages}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={effectivePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
          </DialogHeader>
          {addOpen ? (
            <AddStudentForm
              schoolId={schoolId}
              classLevels={classLevels}
              onClassLevelsChange={onClassLevelsChange}
              onDone={() => {
                setAddOpen(false);
                mutateStudents();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {promoteOpen ? (
        <PromoteClassDialog
          open
          onOpenChange={setPromoteOpen}
          schoolId={schoolId}
          classLevels={classLevels}
          initialClassId={filters.classLevelId !== ALL_VALUE ? filters.classLevelId : undefined}
          onChanged={() => {
            // every cached list of students (and the section picker) is now out of date
            void refreshAll((key) => Array.isArray(key) && (key[0] === "console:students" || key[0] === "console:student-sections" || key[0] === "console:promote-students" || key[0] === "console:student"));
          }}
        />
      ) : null}

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Upload Students</DialogTitle>
          </DialogHeader>
          {bulkOpen ? (
            <BulkUploadForm
              schoolId={schoolId}
              classLevels={classLevels}
              onDone={() => {
                setBulkOpen(false);
                mutateStudents();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
