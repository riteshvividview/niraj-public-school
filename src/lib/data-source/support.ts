import type { SupportRequest, SupportRequestRecord, SupportStatus } from "@/types";
import { toAddress, type PayloadAddressGroup } from "./address-mapper";
import { payloadFind, payloadFindPage } from "./payload-rest";

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

interface PayloadSupportDoc {
  id: string;
  school: string;
  /** A populated object at depth=1, a plain id string at depth=0. */
  user: string | PayloadStudentRef;
  message: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  status: SupportStatus;
  staffNote?: string | null;
  contactNote?: string | null;
  handledByName?: string | null;
  handledAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

function toRequest(doc: PayloadSupportDoc): SupportRequest {
  return {
    id: doc.id,
    schoolId: doc.school,
    userId: typeof doc.user === "string" ? doc.user : doc.user.id,
    message: doc.message,
    contactPhone: doc.contactPhone ?? undefined,
    contactEmail: doc.contactEmail ?? undefined,
    status: doc.status,
    staffNote: doc.staffNote ?? undefined,
    contactNote: doc.contactNote ?? undefined,
    handledByName: doc.handledByName ?? undefined,
    handledAt: doc.handledAt ?? undefined,
    resolvedAt: doc.resolvedAt ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toRecord(doc: PayloadSupportDoc): SupportRequestRecord | null {
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

/** Student — the Support tab's "My queries" list, newest first. */
export async function getSupportRequestsByUser(userId: string): Promise<SupportRequest[]> {
  const docs = await payloadFind<PayloadSupportDoc>("support-requests", { user: userId }, { sort: "-createdAt", limit: 50 });
  return docs.map(toRequest);
}

export interface CreateSupportInput {
  message: string;
  contactPhone?: string;
  contactEmail?: string;
}

export async function createSupportRequest(input: CreateSupportInput): Promise<void> {
  await postAction("/api/support/create", input);
}

/* ------------------------------ console side ------------------------------ */

export interface SupportPageFilters {
  status?: SupportStatus | "unresolved";
  search?: string;
  classLevelId?: string;
}

function buildWhere(schoolId: string, filters: SupportPageFilters): Record<string, unknown> {
  const and: Record<string, unknown>[] = [{ school: { equals: schoolId } }];
  if (filters.status === "unresolved") and.push({ status: { not_equals: "resolved" } });
  else if (filters.status) and.push({ status: { equals: filters.status } });
  const search = filters.search?.trim();
  if (search) {
    and.push({
      or: [
        { "user.name": { contains: search } },
        { "user.username": { contains: search } },
        { message: { contains: search } },
        { contactPhone: { contains: search } },
      ],
    });
  }
  if (filters.classLevelId) and.push({ "user.classLevel": { equals: filters.classLevelId } });
  return { and };
}

export interface SupportPage {
  records: SupportRequestRecord[];
  totalCount: number;
  totalPages: number;
  page: number;
}

export async function getSupportRequestsPageBySchool(
  schoolId: string,
  filters: SupportPageFilters,
  page: number,
  pageSize = 20,
): Promise<SupportPage> {
  const result = await payloadFindPage<PayloadSupportDoc>("support-requests", {
    where: buildWhere(schoolId, filters),
    page,
    limit: pageSize,
    sort: "-createdAt",
    depth: 1,
  });
  const records = result.docs.map(toRecord).filter((r): r is SupportRequestRecord => r !== null);
  return { records, totalCount: result.totalDocs, totalPages: result.totalPages, page: result.page };
}

/** Console — every row matching the filters, for CSV export. */
export async function getAllSupportRequestsBySchool(schoolId: string, filters: SupportPageFilters): Promise<SupportRequestRecord[]> {
  const result = await payloadFindPage<PayloadSupportDoc>("support-requests", {
    where: buildWhere(schoolId, filters),
    page: 1,
    limit: 5000,
    sort: "-createdAt",
    depth: 1,
  });
  return result.docs.map(toRecord).filter((r): r is SupportRequestRecord => r !== null);
}

/** Console — nav badge: queries nobody has picked up yet. */
export async function getOpenSupportCount(schoolId: string): Promise<number> {
  const result = await payloadFindPage<PayloadSupportDoc>("support-requests", {
    where: { and: [{ school: { equals: schoolId } }, { status: { equals: "open" } }] },
    limit: 1,
  });
  return result.totalDocs;
}

export type SupportAction = "start" | "resolve" | "reopen";

export async function transitionSupportRequest(id: string, action: SupportAction, options: { staffNote?: string } = {}): Promise<void> {
  await postAction("/api/support/transition", { id, action, ...options });
}

export async function saveSupportContactNote(id: string, contactNote: string): Promise<void> {
  await postAction("/api/support/transition", { id, action: "note", contactNote });
}
