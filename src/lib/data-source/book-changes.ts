import type {
  AcademicLanguage,
  BookChangeRequest,
  BookChangeRequestRecord,
  BookChangeStatus,
  BookSelection,
  Elective,
  Stream,
} from "@/types";
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

/** Student — Books page: their change requests, newest first (the first one is the "current" one to show). */
export async function getBookChangeRequestsByUser(userId: string): Promise<BookChangeRequest[]> {
  const docs = await payloadFind<PayloadBookChangeDoc>("book-change-requests", { user: userId }, { sort: "-createdAt", limit: 20 });
  return docs.map(toRequest);
}

export interface CreateBookChangeInput extends BookSelection {
  reason: string;
}

export async function createBookChangeRequest(input: CreateBookChangeInput): Promise<void> {
  await postAction("/api/book-change/create", input);
}

export async function cancelBookChangeRequest(id: string): Promise<void> {
  await postAction("/api/book-change/transition", { id, action: "cancel" });
}

/* ------------------------------ console side ------------------------------ */

export interface BookChangePageFilters {
  status?: BookChangeStatus;
  search?: string;
  classLevelId?: string;
}

function buildWhere(schoolId: string, filters: BookChangePageFilters): Record<string, unknown> {
  const and: Record<string, unknown>[] = [{ school: { equals: schoolId } }];
  if (filters.status) and.push({ status: { equals: filters.status } });
  const search = filters.search?.trim();
  if (search) and.push({ or: [{ "user.name": { contains: search } }, { "user.username": { contains: search } }] });
  if (filters.classLevelId) and.push({ "user.classLevel": { equals: filters.classLevelId } });
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

export type BookChangeAction = "approve" | "reject";

export async function transitionBookChangeRequest(
  id: string,
  action: BookChangeAction,
  options: { staffNote?: string } = {},
): Promise<void> {
  await postAction("/api/book-change/transition", { id, action, ...options });
}

export async function saveBookChangeContactNote(id: string, contactNote: string): Promise<void> {
  await postAction("/api/book-change/transition", { id, action: "note", contactNote });
}
