export type ExtraItemStatus = "pending" | "approved" | "rejected" | "cancelled" | "used";

/** A new-admission student's request to buy ONE extra uniform item — staff confirm stock first. Mirrors `extra-item-requests`. */
export interface ExtraItemRequest {
  id: string;
  schoolId: string;
  userId: string;
  uniformItemId: string;
  itemLabel: string;
  size: string;
  note?: string;
  status: ExtraItemStatus;
  staffNote?: string;
  handledByName?: string;
  handledAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Console list row: the request plus who asked. */
export interface ExtraItemRequestRecord extends ExtraItemRequest {
  student: { id: string; name: string; registerNumber: string; classLevelId: string; section?: string; mobileNumber?: string };
}

/** What the server says about the signed-in student (see /api/new-admission/status). */
export interface NewAdmissionStatus {
  isNew: boolean;
  /** The full set has been bought (it can only be bought once). */
  setBought: boolean;
  startMonth: number;
  /** "2026-27" */
  academicYear: string;
  /** Existing students: they already bought uniform of their current class (their first order must be the full list). */
  firstUniformDone?: boolean;
  /** The items a new student must buy together (empty once bought, and for existing students). */
  requiredIds: string[];
}

/** Console — Catalogue Manager's New Admission section. */
export interface NewAdmissionSummary {
  academicYear: string;
  startMonth: number;
  totalStudents: number;
  newCount: number;
  setBoughtCount: number;
  /** Students with a staff override (new / existing). */
  overrides: number;
  /** New students who haven't bought the set yet (first 100). */
  waiting: Array<{ id: string; name: string; registerNumber: string; classLevelId: string }>;
}
