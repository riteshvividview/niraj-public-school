import type { LanguageCode } from "./language";

export type UserRole = "parent" | "student";

/**
 * Mirrors the Payload `users` collection (a real `auth: true` collection —
 * see .claude/DECISIONS.md). Email/password is the login identifier;
 * mobileNumber is optional contact info only, not used for auth.
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  mobileNumber?: string;
  role: UserRole;
  schoolId: string;
  classLevelId: string;
  preferredLanguage: LanguageCode;
  createdAt: string;
  updatedAt: string;
}
