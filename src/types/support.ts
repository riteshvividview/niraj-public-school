import type { Address } from "./address";
export type SupportStatus = "open" | "in-progress" | "resolved";

/**
 * Mirrors the Payload `support-requests` collection — one message from a
 * parent/student to the school. No back-and-forth thread: staff read it and
 * contact the family directly (phone / WhatsApp / email).
 */
export interface SupportRequest {
  id: string;
  schoolId: string;
  userId: string;
  message: string;
  /** Where the family asked to be reached — prefilled from their profile when they sent it. */
  contactPhone?: string;
  contactEmail?: string;
  status: SupportStatus;
  staffNote?: string;
  /** Free-text log of calls/conversations — staff-only. */
  contactNote?: string;
  handledByName?: string;
  handledAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportRequestRecord extends SupportRequest {
  student: {
    name: string;
    registerNumber: string;
    classLevelId: string;
    section?: string;
    mobileNumber?: string;
    email?: string;
    address?: Address;
  };
}
