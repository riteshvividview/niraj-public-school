import type { LanguageCode } from "./language";

export type UserRole = "parent" | "student";

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
  createdAt: string;
  updatedAt: string;
}
