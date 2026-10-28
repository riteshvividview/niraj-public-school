import type {
  AcademicLanguage,
  BookChangeRequest,
  BookChangeRequestRecord,
  BookChangeStatus,
  BookSelection,
  Elective,
  Stream,
} from "@/types";
import { toAddress, type PayloadAddressGroup } from "./address-mapper";
import { payloadFind, payloadFindPage } from "./payload-rest";

interface PayloadSelectionGroup {
  secondLanguage?: AcademicLanguage | null;
  stream?: Stream | null;
  elective?: Elective | null;
}

interface PayloadStudentRef {
  id: string;
  name: string;
  username: string;
  classLevel: string;
  section?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
  address?: PayloadAddressGroup | null;
}

interface PayloadBookChangeDoc {
  id: string;
  school: string;
  /** A populated object at depth=1, a plain id string at depth=0. */
  user: string | PayloadStudentRef;
  requested?: PayloadSelectionGroup | null;
  current?: PayloadSelectionGroup | null;
  reason: string;
  status: BookChangeStatus;
  staffNote?: string | null;
  contactNote?: string | null;
  decidedByName?: string | null;
  decidedAt?: string | null;
  classLevel?: string | { id: string } | null;
  classLabel?: string | null;
  changedByType?: "student" | "staff" | null;
  changedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

function toSelection(group: PayloadSelectionGroup | null | undefined): BookSelection {
  return {
    secondLanguage: group?.secondLanguage ?? undefined,
    stream: group?.stream ?? undefined,
    elective: group?.elective ?? undefined,
  };
}

function toRequest(doc: PayloadBookChangeDoc): BookChangeRequest {
  return {
    id: doc.id,
    schoolId: doc.school,
    userId: typeof doc.user === "string" ? doc.user : doc.user.id,
    requested: toSelection(doc.requested),
    current: toSelection(doc.current),
    reason: doc.reason,
    status: doc.status,
    staffNote: doc.staffNote ?? undefined,
    contactNote: doc.contactNote ?? undefined,
    decidedByName: doc.decidedByName ?? undefined,
    decidedAt: doc.decidedAt ?? undefined,
    classLevelId: doc.classLevel ? (typeof doc.classLevel === "string" ? doc.classLevel : doc.classLevel.id) : undefined,
    classLabel: doc.classLabel ?? undefined,
    changedByType: doc.changedByType ?? undefined,
    changedByName: doc.changedByName ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toRecord(doc: PayloadBookChangeDoc): BookChangeRequestRecord | null {
  if (typeof doc.user === "string") return null; // needs depth=1
  return {
    ...toRequest(doc),
    student: {
      name: doc.user.name,
      registerNumber: doc.user.username,
      classLevelId: doc.user.classLevel,
      section: doc.user.section ?? undefined,
      mobileNumber: doc.user.mobileNumber ?? undefined,
      email: doc.user.email ?? undefined,
      address: toAddress(doc.user.address),
    },
  };
}

async function postAction<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as ({ error?: string } & T) | null;
  if (!res.ok) throw new Error(data?.error ?? "Something went wrong. Please try again.");
  return data as T;
}

/* ------------------------------ student side ------------------------------ */

/* ------------------------------ console side ------------------------------ */

export interface BookChangePageFilters {
  search?: string;
  /** The class the student was in WHEN they made the change. */
  classLevelId?: string;
  changedBy?: "student" | "staff";
}

/** The subject-change log: every change that actually happened (made directly, or approved under the old flow). */
function buildWhere(schoolId: string, filters: BookChangePageFilters): Record<string, unknown> {
  const and: Record<string, unknown>[] = [{ school: { equals: schoolId } }, { status: { in: ["applied", "approved"] } }];
  const search = filters.search?.trim();
  if (search) and.push({ or: [{ "user.name": { contains: search } }, { "user.username": { contains: search } }] });
  if (filters.classLevelId) and.push({ classLevel: { equals: filters.classLevelId } });
  if (filters.changedBy) and.push({ changedByType: { equals: filters.changedBy } });
  return { and };
}

export interface BookChangePage {
  records: BookChangeRequestRecord[];
  totalCount: number;
  totalPages: number;
  page: number;
}

export async function getBookChangeRequestsPageBySchool(
  schoolId: string,
  filters: BookChangePageFilters,
  page: number,
  pageSize = 20,
): Promise<BookChangePage> {
  const result = await payloadFindPage<PayloadBookChangeDoc>("book-change-requests", {
    where: buildWhere(schoolId, filters),
    page,
    limit: pageSize,
    sort: "-createdAt",
    depth: 1,
  });
  const records = result.docs.map(toRecord).filter((r): r is BookChangeRequestRecord => r !== null);
  return { records, totalCount: result.totalDocs, totalPages: result.totalPages, page: result.page };
}

export async function getPendingBookChangeCount(schoolId: string): Promise<number> {
  const result = await payloadFindPage<PayloadBookChangeDoc>("book-change-requests", {
    where: { and: [{ school: { equals: schoolId } }, { status: { equals: "pending" } }] },
    limit: 1,
  });
  return result.totalDocs;
}


/* ------------------------- student's own choice ------------------------- */

/** Student — can they still change their book choice (not once this class's books are bought / being paid for)? */
export async function getBookSelectionState(): Promise<{ locked: boolean; current: BookSelection }> {
  const res = await fetch("/api/books/selection", { credentials: "same-origin", cache: "no-store" });
  const data = (await res.json().catch(() => null)) as ({ error?: string; locked: boolean; current: BookSelection }) | null;
  if (!res.ok || !data) throw new Error(data?.error ?? "Something went wrong. Please try again.");
  return { locked: data.locked, current: data.current };
}

/** Student — save their confirmed choice (only what differs is changed, and it is logged for the school). */
export async function saveBookSelection(selection: BookSelection): Promise<{ changed: boolean }> {
  return postAction<{ changed: boolean }>("/api/books/selection", selection);
}
