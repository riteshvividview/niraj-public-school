import type { LanguageCode } from "./language";

export type UserRole = "parent" | "student";
export type Gender = "male" | "female";
export type AcademicLanguage = "hindi" | "telugu";
export type LanguageLevel = "first" | "second";
export type Stream = "science" | "economics";
export type Elective = "ena" | "roboticsAI" | "homeScience";

/**
 * Mirrors the Payload `users` collection (a real `auth: true` collection —
 * see .claude/DECISIONS.md). No self-registration: staff/teachers create
 * these records (one by one or via bulk import) from the school console or
 * /admin. `registerNumber` is the login identifier (Payload's built-in
 * `username` field under the hood); mobileNumber is optional contact info
 * only, not used for auth.
 */
export interface UserProfile {
  id: string;
  name: string;
  registerNumber: string;
  avatarUrl?: string;
  mobileNumber?: string;
  role: UserRole;
  schoolId: string;
  classLevelId: string;
  preferredLanguage: LanguageCode;
  /** Roster/academic attributes — see Users.ts's collection comment. All optional: not every grade/import provides them. */
  section?: string;
  gender?: Gender;
  academicLanguage?: AcademicLanguage;
  languageLevel?: LanguageLevel;
  stream?: Stream;
  elective?: Elective;
  createdAt: string;
  updatedAt: string;
}
