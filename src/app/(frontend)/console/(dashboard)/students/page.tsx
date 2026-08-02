"use client";

import { AlertCircle, CheckCircle2, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
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
import { UserAvatar } from "@/components/shared/user-avatar";
import { parseStudentsFile, type ParsedStudentRow } from "@/lib/bulk-import";
import {
  bulkCreateStudents,
  createStudent,
  deleteStudent,
  getClassLevelsBySchool,
  getSchools,
  getStudentsBySchool,
  resetStudentPassword,
  updateStudent,
  type BulkCreateResult,
  type CreateStudentInput,
} from "@/lib/data-source";
import type { ClassLevel, UserProfile } from "@/types";

// --- Add / Edit student ----------------------------------------------------

function AddStudentForm({
  schoolId,
  classLevels,
  onDone,
}: {
  schoolId: string;
  classLevels: ClassLevel[];
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [password, setPassword] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [classLevelId, setClassLevelId] = useState(classLevels[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !registerNumber.trim() || !password || !classLevelId) return;
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
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create this student.");
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="student-name">Name</Label>
        <Input id="student-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
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
      </div>
      <div className="space-y-2">
        <Label>Class</Label>
        <Select value={classLevelId} onValueChange={setClassLevelId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {classLevels.map((level) => (
              <SelectItem key={level.id} value={level.id}>
                {level.label}
              </SelectItem>
            ))}
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

function EditStudentForm({
  student,
  classLevels,
  onDone,
}: {
  student: UserProfile;
  classLevels: ClassLevel[];
  onDone: () => void;
}) {
  const [name, setName] = useState(student.name);
  const [mobileNumber, setMobileNumber] = useState(student.mobileNumber ?? "");
  const [classLevelId, setClassLevelId] = useState(student.classLevelId);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !classLevelId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await updateStudent(student.id, {
        name: name.trim(),
        mobileNumber: mobileNumber.trim() || undefined,
        classLevelId,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes.");
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="edit-name">Name</Label>
        <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Register number</Label>
        <Input value={student.registerNumber} disabled />
        <p className="text-xs text-sub">Register number can&apos;t be changed once created.</p>
      </div>
      <div className="space-y-2">
        <Label>Class</Label>
        <Select value={classLevelId} onValueChange={setClassLevelId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {classLevels.map((level) => (
              <SelectItem key={level.id} value={level.id}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-mobile">Mobile number (optional)</Label>
        <Input id="edit-mobile" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Save Changes
        </Button>
      </DialogFooter>
    </form>
  );
}

function ResetPasswordForm({ student, onDone }: { student: UserProfile; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await resetStudentPassword(student.id, password);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reset the password.");
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <p className="text-sm text-sub">
        Set a new password for <span className="font-medium text-ink">{student.name}</span> (
        {student.registerNumber}).
      </p>
      <div className="space-y-2">
        <Label htmlFor="reset-password">New password</Label>
        <Input
          id="reset-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Reset Password
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

function resolveRows(rows: ParsedStudentRow[], classLevels: ClassLevel[]): ResolvedRow[] {
  return rows.map((row) => {
    if (!row.name || !row.registerNumber) {
      return { ...row, issue: "Missing name or register number" };
    }
    const match = row.className
      ? classLevels.find((level) => level.label.toLowerCase() === row.className!.toLowerCase())
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
      setParseError(err instanceof Error ? err.message : "Couldn't read that file.");
    }
  }

  const validRows = (rows ?? []).filter((row) => !row.issue);

  async function handleImport() {
    setIsImporting(true);
    const inputs: CreateStudentInput[] = validRows.map((row) => ({
      name: row.name,
      registerNumber: row.registerNumber,
      password: row.password && row.password.length >= 8 ? row.password : row.registerNumber,
      mobileNumber: row.mobileNumber,
      role: "student",
      schoolId,
      classLevelId: row.classLevelId!,
    }));
    const outcome = await bulkCreateStudents(inputs);
    setResults(outcome);
    setIsImporting(false);
  }

  if (results) {
    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.length - succeeded;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-muted p-4">
          <CheckCircle2 className="size-5 shrink-0 text-section-essentials" />
          <p className="text-sm text-ink">
            {succeeded} student{succeeded === 1 ? "" : "s"} imported{failed ? `, ${failed} failed` : ""}.
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
      <p className="text-sm text-sub">
        Upload a CSV, Excel (.xlsx/.xls), ODS, or JSON file with columns for name, register number,
        class, and optionally password and mobile number. Rows without a password default to using
        the register number as the password.
      </p>

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
            {rows.length} row{rows.length === 1 ? "" : "s"} found — {validRows.length} ready to import
            {rows.length - validRows.length ? `, ${rows.length - validRows.length} with issues` : ""}.
          </p>
          <div className="max-h-56 overflow-y-auto rounded-2xl border border-line">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Register #</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.name || "—"}</TableCell>
                    <TableCell>{row.registerNumber || "—"}</TableCell>
                    <TableCell>{row.className || "—"}</TableCell>
                    <TableCell className={row.issue ? "text-destructive" : "text-section-essentials"}>
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
        <Button type="button" disabled={!validRows.length || isImporting} onClick={handleImport}>
          {isImporting ? <Loader2 className="size-4 animate-spin" /> : null}
          Import {validRows.length ? `${validRows.length} Student${validRows.length === 1 ? "" : "s"}` : ""}
        </Button>
      </DialogFooter>
    </div>
  );
}

// --- Page --------------------------------------------------------------

export default function StudentsManagerPage() {
  const [schoolId, setSchoolId] = useState("");
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [students, setStudents] = useState<UserProfile[] | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [resettingPassword, setResettingPassword] = useState<UserProfile | null>(null);

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
    getStudentsBySchool(schoolId).then(setStudents);
  }, [schoolId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const classLabelById = new Map(classLevels.map((level) => [level.id, level.label]));

  async function handleDelete(student: UserProfile) {
    if (!window.confirm(`Remove ${student.name} (${student.registerNumber})? This can't be undone.`)) return;
    await deleteStudent(student.id);
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Students</h1>
          <p className="text-sm text-sub">
            Add students one at a time, or bulk-import a class list from a spreadsheet. Only students
            added here can log in.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" disabled={!schoolId} onClick={() => setBulkOpen(true)}>
            <Upload className="size-4" />
            Bulk Upload
          </Button>
          <Button className="gap-2" disabled={!schoolId} onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add Student
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Register #</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(students ?? []).map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={student.name} avatarUrl={student.avatarUrl} size="sm" />
                      {student.name}
                    </div>
                  </TableCell>
                  <TableCell>{student.registerNumber}</TableCell>
                  <TableCell>{classLabelById.get(student.classLevelId) ?? "—"}</TableCell>
                  <TableCell>{student.mobileNumber ?? "—"}</TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(student)}>
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setResettingPassword(student)}>
                      Reset Password
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(student)}>
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {students !== null && students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sub">
                    No students yet — add one or bulk-upload a class list.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
          </DialogHeader>
          {addOpen ? (
            <AddStudentForm
              schoolId={schoolId}
              classLevels={classLevels}
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

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          {editing ? (
            <EditStudentForm
              key={editing.id}
              student={editing}
              classLevels={classLevels}
              onDone={() => {
                setEditing(null);
                refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resettingPassword)} onOpenChange={(open) => !open && setResettingPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          {resettingPassword ? (
            <ResetPasswordForm
              key={resettingPassword.id}
              student={resettingPassword}
              onDone={() => setResettingPassword(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
