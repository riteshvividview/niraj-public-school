import type { ExtraItemRequest, ExtraItemRequestRecord, ExtraItemStatus, NewAdmissionStatus, NewAdmissionSummary } from "@/types";
import { payloadFindById, payloadFindPage, payloadUpdate } from "./payload-rest";

/**
 * New-admission students: who is new (decided on the server), the single-extra-item
 * request flow, and the console's Catalogue Manager numbers. The rules themselves
 * live in src/lib/server/uniform/new-admission.ts and are enforced when paying.
 */
async function call<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; body: T & { error?: string } }> {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, credentials: "same-origin", cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { ok: res.ok, body };
}

const orThrow = <T>(result: { ok: boolean; body: T & { error?: string } }, fallback: string): T => {
  if (!result.ok) throw new Error(result.body.error ?? fallback);
  return result.body;
};

// ---- parent -------------------------------------------------------------------------------------

export async function getMyNewAdmissionStatus(): Promise<NewAdmissionStatus> {
  return orThrow(await call<NewAdmissionStatus>("/api/new-admission/status"), "Could not load your uniform details.");
}

interface PayloadExtraDoc {
  id: string;
  school: string;
  user: string | { id: string; name: string; username: string; classLevel: string; section?: string | null; mobileNumber?: string | null };
  uniformItem: string | { id: string };
  itemLabel: string;
  size: string;
  note?: string | null;
  status: ExtraItemStatus;
  staffNote?: string | null;
  handledByName?: string | null;
  handledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

function toRequest(doc: PayloadExtraDoc): ExtraItemRequest {
  return {
    id: doc.id,
    schoolId: doc.school,
    userId: typeof doc.user === "string" ? doc.user : doc.user.id,
    uniformItemId: typeof doc.uniformItem === "string" ? doc.uniformItem : doc.uniformItem.id,
    itemLabel: doc.itemLabel,
    size: doc.size,
    note: doc.note ?? undefined,
    status: doc.status,
    staffNote: doc.staffNote ?? undefined,
    handledByName: doc.handledByName ?? undefined,
    handledAt: doc.handledAt ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** The student's own requests, newest first (REST read is limited to the owner). */
export async function getMyExtraItemRequests(userId: string): Promise<ExtraItemRequest[]> {
  const page = await payloadFindPage<PayloadExtraDoc>("extra-item-requests", { where: { user: { equals: userId } }, limit: 50, sort: "-createdAt" });
  return page.docs.map(toRequest);
}

export async function createExtraItemRequest(input: { uniformItemId: string; size: string; note?: string }): Promise<void> {
  orThrow(await call<{ ok: boolean }>("/api/extra-items/create", { method: "POST", body: JSON.stringify(input) }), "We couldn't send your request.");
}

export async function cancelExtraItemRequest(id: string): Promise<void> {
  orThrow(await call<{ ok: boolean }>("/api/extra-items/transition", { method: "POST", body: JSON.stringify({ id, action: "cancel" }) }), "We couldn't cancel the request.");
}

// ---- console ---------------------------------------------------------------------------------------

export async function decideExtraItemRequest(id: string, action: "approve" | "reject", staffNote?: string): Promise<void> {
  orThrow(
    await call<{ ok: boolean }>("/api/extra-items/transition", { method: "POST", body: JSON.stringify({ id, action, staffNote }) }),
    "Something went wrong.",
  );
}

export interface ExtraItemFilters {
  status?: ExtraItemStatus | "open";
  search?: string;
}

export interface ExtraItemRequestsPage {
  records: ExtraItemRequestRecord[];
  totalCount: number;
  totalPages: number;
  page: number;
}

export async function getExtraItemRequestsPageBySchool(schoolId: string, filters: ExtraItemFilters, page: number, pageSize = 20): Promise<ExtraItemRequestsPage> {
  const and: Record<string, unknown>[] = [{ school: { equals: schoolId } }];
  if (filters.status === "open") and.push({ status: { equals: "pending" } });
  else if (filters.status) and.push({ status: { equals: filters.status } });
  const search = filters.search?.trim();
  if (search) and.push({ or: [{ "user.name": { contains: search } }, { "user.username": { contains: search } }, { itemLabel: { contains: search } }] });
  const result = await payloadFindPage<PayloadExtraDoc>("extra-item-requests", { where: { and }, page, limit: pageSize, sort: "-createdAt", depth: 1 });
  const records: ExtraItemRequestRecord[] = [];
  for (const doc of result.docs) {
    if (typeof doc.user === "string") continue;
    records.push({
      ...toRequest(doc),
      student: {
        id: doc.user.id,
        name: doc.user.name,
        registerNumber: doc.user.username,
        classLevelId: doc.user.classLevel,
        section: doc.user.section ?? undefined,
        mobileNumber: doc.user.mobileNumber ?? undefined,
      },
    });
  }
  return { records, totalCount: result.totalDocs, totalPages: result.totalPages, page: result.page };
}

export async function countPendingExtraItemRequests(schoolId: string): Promise<number> {
  const result = await payloadFindPage<PayloadExtraDoc>("extra-item-requests", {
    where: { and: [{ school: { equals: schoolId } }, { status: { equals: "pending" } }] },
    limit: 1,
  });
  return result.totalDocs;
}

export async function getNewAdmissionSummary(schoolId: string, light = false): Promise<NewAdmissionSummary> {
  return orThrow(
    await call<NewAdmissionSummary>(`/api/new-admission/summary?schoolId=${encodeURIComponent(schoolId)}${light ? "&light=1" : ""}`),
    "Could not load the new-admission numbers.",
  );
}

/** Administrator-only (field-level access). Reads back to confirm it was really saved. */
export async function getAcademicYearStartMonth(schoolId: string): Promise<number> {
  const doc = await payloadFindById<{ academicYearStartMonth?: number | null }>("schools", schoolId);
  return doc?.academicYearStartMonth ?? 4;
}

export async function setAcademicYearStartMonth(schoolId: string, month: number): Promise<number> {
  await payloadUpdate("schools", schoolId, { academicYearStartMonth: month });
  const stored = await getAcademicYearStartMonth(schoolId);
  if (stored !== month) throw new Error("Only an administrator can change this setting.");
  return stored;
}
