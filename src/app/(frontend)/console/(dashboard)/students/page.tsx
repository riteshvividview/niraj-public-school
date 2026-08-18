"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  Upload,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";
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
  getClassLevelsBySchool,
  getSchools,
  getStudentsBySchool,
  type BulkCreateResult,
  type CreateStudentInput,
} from "@/lib/data-source";
import {
  deriveLanguage,
  ELECTIVE_OPTIONS,
  electiveLabel,
  firstLanguageOf,
  LANGUAGE_OPTIONS,
  LanguageAndSpecializationFields,
  secondLanguageOf,
  STREAM_OPTIONS,
} from "./_components/student-shared";
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
  const [classLevelId, setClassLevelId] = useState(classLevels[0]?.id ?? "");
  const [section, setSection] = useState("");
  const [gender, setGender] = useState<UserProfile["gender"] | "">("");
  const [firstLanguage, setFirstLanguage] = useState<AcademicLanguage | "">("");
  const [secondLanguage, setSecondLanguage] = useState<AcademicLanguage | "">("");
  const [stream, setStream] = useState<Stream | "">("");
  const [elective, setElective] = useState<Elective | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !registerNumber.trim() || !password || !classLevelId)
      return;
    setError(null);
    setIsSubmitting(true);
    try {
      await createStudent({
        name: name.trim(),
        registerNumber: registerNumber.trim(),
        password,
        mobileNumber: mobileNumber.trim() || undefined,
        role: "student",
        schoolId,
        classLevelId,
        section: section.trim() || undefined,
        gender: gender || undefined,
        stream: stream || undefined,
        elective: elective || undefined,
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

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    Object.entries(filters).some(([key, value]) => key !== "search" && value !== ALL_VALUE);

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
        <Select value={filters.firstLanguage} onValueChange={(v) => set("firstLanguage", v)}>
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
        <Select value={filters.secondLanguage} onValueChange={(v) => set("secondLanguage", v)}>
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
      {hasActiveFilters ? (
        <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

function StudentRow({ student, classLabel }: { student: UserProfile; classLabel: string }) {
  const firstLang = firstLanguageOf(student);
  const secondLang = secondLanguageOf(student);
  return (
    <Link
      href={`/console/students/${student.id}`}
      className="flex items-center gap-3 rounded-xl border border-line/60 bg-card p-3.5 transition-colors hover:border-brand/40 hover:bg-muted/40"
    >
      <UserAvatar name={student.name} avatarUrl={student.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{student.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-sub">
          <span>{student.registerNumber}</span>
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
      </div>
      <ChevronRight className="size-4 shrink-0 text-sub" />
    </Link>
  );
}

export default function StudentsManagerPage() {
  const [schoolId, setSchoolId] = useState("");
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [students, setStudents] = useState<UserProfile[] | null>(null);
  const [filters, setFilters] = useState<StudentFilters>(EMPTY_FILTERS);

  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    getSchools().then((schools) => {
      if (schools.length > 0) setSchoolId(schools[0].id);
    });
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    getClassLevelsBySchool(schoolId).then(setClassLevels);
  }, [schoolId]);

  const refresh = useCallback(() => {
    if (!schoolId) return;
    setStudents(null);
    getStudentsBySchool(schoolId).then(setStudents);
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    getStudentsBySchool(schoolId).then(setStudents);
  }, [schoolId]);

  const classLabelById = new Map(
    classLevels.map((level) => [level.id, level.label]),
  );

  const sections = Array.from(
    new Set((students ?? []).map((s) => s.section).filter((s): s is string => Boolean(s))),
  ).sort();

  const filteredStudents = (students ?? []).filter((student) => {
    const search = filters.search.trim().toLowerCase();
    if (
      search &&
      !student.name.toLowerCase().includes(search) &&
      !student.registerNumber.toLowerCase().includes(search)
    )
      return false;
    if (filters.classLevelId !== ALL_VALUE && student.classLevelId !== filters.classLevelId) return false;
    if (filters.section !== ALL_VALUE && student.section !== filters.section) return false;
    if (filters.gender !== ALL_VALUE && student.gender !== filters.gender) return false;
    if (filters.firstLanguage !== ALL_VALUE && firstLanguageOf(student) !== filters.firstLanguage) return false;
    if (filters.secondLanguage !== ALL_VALUE && secondLanguageOf(student) !== filters.secondLanguage) return false;
    if (filters.stream !== ALL_VALUE && student.stream !== filters.stream) return false;
    if (filters.elective !== ALL_VALUE && student.elective !== filters.elective) return false;
    return true;
  });

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
              {filteredStudents.length} of {students.length} students
            </p>
          ) : null}
          {students === null ? (
            <ConsoleListSkeleton />
          ) : filteredStudents.length === 0 ? (
            <p className="rounded-xl border border-line/60 py-10 text-center text-sm text-sub">
              {students.length === 0
                ? "No students yet — add one or bulk-upload a class list."
                : "No students match these filters."}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student) => (
                <StudentRow
                  key={student.id}
                  student={student}
                  classLabel={classLabelById.get(student.classLevelId) ?? "—"}
                />
              ))}
            </div>
          )}
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
              onClassLevelsChange={setClassLevels}
              onDone={() => {
                setAddOpen(false);
                refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

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
                refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
