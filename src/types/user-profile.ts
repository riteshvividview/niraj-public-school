import type { LanguageCode } from "./language";

export type UserRole = "parent" | "student";

/**
 * Mirrors the future Payload `users` collection. Auth is mocked until
 * Phase 9 — see CLAUDE.md and .claude/DECISIONS.md.
 */
export interface UserProfile {
  id: string;
  name: string;
  /** E.164-ish format, e.g. "+919876543210". */
  mobileNumber: string;
  role: UserRole;
  schoolId: string;
  classLevelId: string;
  preferredLanguage: LanguageCode;
  createdAt: string;
  updatedAt: string;
}
