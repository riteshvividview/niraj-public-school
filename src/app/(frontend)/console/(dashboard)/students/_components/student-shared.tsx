"use client";

import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ClassLevelSelect } from "@/components/shared/class-level-select";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { firstLanguageOf, oppositeLanguage, secondLanguageOf } from "@/lib/academic-language";
import { draftFromAddress } from "@/lib/address";
import { resetStudentPassword, updateStudent } from "@/lib/data-source";
import { resolveAddressDraft, StaffAddressSection } from "./staff-address-section";
import type { AcademicLanguage, ClassLevel, Elective, Stream, UserProfile } from "@/types";

export const NONE_VALUE = "__none__";

export const LANGUAGE_OPTIONS: { value: AcademicLanguage; label: string }[] = [
  { value: "hindi", label: "Hindi" },
  { value: "telugu", label: "Telugu" },
];
export const STREAM_OPTIONS: { value: Stream; label: string }[] = [
  { value: "science", label: "Science" },
  { value: "economics", label: "Economics" },
];
export const ELECTIVE_OPTIONS: { value: Elective; label: string }[] = [
  { value: "ena", label: "ENA" },
  { value: "homeScience", label: "Home Science" },
  { value: "roboticsAI", label: "Robotics & AI" },
];

export function electiveLabel(elective: Elective | undefined): string {
  if (elective === "roboticsAI") return "Robotics & AI";
  if (elective === "homeScience") return "Home Science";
  if (elective === "ena") return "ENA";
  return "—";
}

export { firstLanguageOf, secondLanguageOf };

/**
 * The roster only ever records one language pick per student (as either
 * their first or second language) — see bulk-import.ts's parseLanguageCell.
 * The Add/Edit forms surface this as two separate selects per the school's
 * own terminology, but they stay mutually exclusive under the hood — picking
 * either one auto-fills the other with its opposite (see
 * LanguageAndSpecializationFields), so whichever was picked last is "the"
 * source of truth here.
 */
export function deriveLanguage(
  firstLanguage: AcademicLanguage | "",
  secondLanguage: AcademicLanguage | "",
): { academicLanguage?: AcademicLanguage; languageLevel?: "first" | "second" } {
  if (firstLanguage) return { academicLanguage: firstLanguage, languageLevel: "first" };
  if (secondLanguage) return { academicLanguage: secondLanguage, languageLevel: "second" };
  return {};
}

export function LanguageAndSpecializationFields({
  firstLanguage,
  setFirstLanguage,
  secondLanguage,
  setSecondLanguage,
  stream,
  setStream,
  elective,
  setElective,
}: {
  firstLanguage: AcademicLanguage | "";
  setFirstLanguage: (v: AcademicLanguage | "") => void;
  secondLanguage: AcademicLanguage | "";
  setSecondLanguage: (v: AcademicLanguage | "") => void;
  stream: Stream | "";
  setStream: (v: Stream | "") => void;
  elective: Elective | "";
  setElective: (v: Elective | "") => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <Label>First Language</Label>
        <Select
          value={firstLanguage || NONE_VALUE}
          onValueChange={(v) => {
            const next = v === NONE_VALUE ? "" : (v as AcademicLanguage);
            setFirstLanguage(next);
            // Always the opposite of the other — picking one fully
            // determines both, so there's never a matching or blank pair.
            setSecondLanguage(next ? oppositeLanguage(next) : "");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>None</SelectItem>
            {LANGUAGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Second Language</Label>
        <Select
          value={secondLanguage || NONE_VALUE}
          onValueChange={(v) => {
            const next = v === NONE_VALUE ? "" : (v as AcademicLanguage);
            setSecondLanguage(next);
            setFirstLanguage(next ? oppositeLanguage(next) : "");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>None</SelectItem>
            {LANGUAGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Specialization 1</Label>
        <Select
          value={stream || NONE_VALUE}
          onValueChange={(v) => setStream(v === NONE_VALUE ? "" : (v as Stream))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>None</SelectItem>
            {STREAM_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Specialization 2</Label>
        <Select
          value={elective || NONE_VALUE}
          onValueChange={(v) => setElective(v === NONE_VALUE ? "" : (v as Elective))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>None</SelectItem>
            {ELECTIVE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// --- Edit / Reset Password — used by the Student Detail page -------------

export function EditStudentForm({
  student,
  classLevels,
  onClassLevelsChange,
  onDone,
}: {
  student: UserProfile;
  classLevels: ClassLevel[];
  onClassLevelsChange: (levels: ClassLevel[]) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(student.name);
  const [mobileNumber, setMobileNumber] = useState(student.mobileNumber ?? "");
  const [email, setEmail] = useState(student.email ?? "");
  const [classLevelId, setClassLevelId] = useState(student.classLevelId);
  const [section, setSection] = useState(student.section ?? "");
  const [gender, setGender] = useState<UserProfile["gender"] | "">(student.gender ?? "");
  const [firstLanguage, setFirstLanguage] = useState<AcademicLanguage | "">(firstLanguageOf(student) ?? "");
  const [secondLanguage, setSecondLanguage] = useState<AcademicLanguage | "">(secondLanguageOf(student) ?? "");
  const [stream, setStream] = useState<Stream | "">(student.stream ?? "");
  const [elective, setElective] = useState<Elective | "">(student.elective ?? "");
  const [address, setAddress] = useState(() => draftFromAddress(student.address));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !classLevelId) return;
    const resolvedAddress = resolveAddressDraft(address, Boolean(student.address));
    if (!resolvedAddress.ok) {
      setError(resolvedAddress.error);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await updateStudent(student.id, {
        address: resolvedAddress.address,
        name: name.trim(),
        mobileNumber: mobileNumber.trim() || undefined,
        email: email.trim() || undefined,
        classLevelId,
        section: section.trim() || undefined,
        gender: gender || undefined,
        stream: stream || undefined,
        elective: elective || undefined,
        ...deriveLanguage(firstLanguage, secondLanguage),
      });
      toast.success("Student updated");
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
        <ClassLevelSelect
          schoolId={student.schoolId}
          classLevels={classLevels}
          value={classLevelId}
          onChange={setClassLevelId}
          onClassLevelsChange={onClassLevelsChange}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-section">Section (optional)</Label>
          <Input
            id="edit-section"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="e.g. A"
          />
        </div>
        <div className="space-y-2">
          <Label>Gender (optional)</Label>
          <Select value={gender || undefined} onValueChange={(value) => setGender(value as UserProfile["gender"])}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-mobile">Mobile number (optional)</Label>
          <Input id="edit-mobile" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-email">Email (optional)</Label>
          <Input
            id="edit-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="For order/OTP notifications"
          />
        </div>
      </div>
      <StaffAddressSection draft={address} onChange={setAddress} idPrefix="edit-address" />
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

export function ResetPasswordForm({ student, onDone }: { student: UserProfile; onDone: () => void }) {
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
      toast.success("Password reset");
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
