import type { AcademicLanguage, Elective, Stream } from "./user-profile";

export type BookChangeStatus = "pending" | "approved" | "rejected" | "cancelled";

/** The three student attributes that decide which book set a student gets. Unset = unchanged / not recorded. */
export interface BookSelection {
  /** The student's SECOND language (see secondLanguageOf in src/lib/academic-language.ts). */
  secondLanguage?: AcademicLanguage;
  stream?: Stream;
  elective?: Elective;
}

/**
 * Mirrors the Payload `book-change-requests` collection — a student asking
 * the school to switch their assigned second language / specialization.
 * Approving it updates the student's profile; the student can't self-switch.
 */
export interface BookChangeRequest {
  id: string;
  schoolId: string;
  userId: string;
  /** Only the fields the student wants changed are set. */
  requested: BookSelection;
  /** Snapshot of what the student had when they asked. */
  current: BookSelection;
  reason: string;
  status: BookChangeStatus;
  staffNote?: string;
  contactNote?: string;
  decidedByName?: string;
  decidedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookChangeRequestRecord extends BookChangeRequest {
  student: {
    name: string;
    registerNumber: string;
    classLevelId: string;
    section?: string;
    mobileNumber?: string;
    email?: string;
  };
}
