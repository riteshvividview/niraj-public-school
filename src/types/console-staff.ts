export type ConsoleStaffRole = "administrator" | "staff";
export type ConsoleStaffStatus = "invited" | "active" | "disabled";

/** Mirrors the `payload-admins` collection — the Console's (and raw /admin's) one account system. See src/collections/PayloadAdmins.ts. */
export interface ConsoleStaffProfile {
  id: string;
  name: string;
  email: string;
  role: ConsoleStaffRole;
  status: ConsoleStaffStatus;
  invitedByEmail?: string;
  invitedAt?: string;
  lastLoginAt?: string;
}
