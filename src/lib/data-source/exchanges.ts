import type { ExchangeReason, ExchangeRequest, ExchangeRequestRecord, ExchangeStatus } from "@/types";
import { payloadFind, payloadFindPage } from "./payload-rest";

interface PayloadStudentRef {
  id: string;
  name: string;
  username: string;
  classLevel: string;
  section?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
}

interface PayloadExchangeDoc {
  id: string;
  school: string;
  /** A populated object at depth=1, a plain id string at depth=0. */
  user: string | PayloadStudentRef;
  order: string;
  receipt: string | { id: string; qrPayload: string };
  orderItemId: string;
  uniformItemId: string;
  itemLabel: string;
  fromSize: string;
  toSize: string;
  quantity: number;
  fromUnitPrice: number;
  toUnitPrice: number;
  priceDifference: number;
  reason: ExchangeReason;
  note?: string | null;
  status: ExchangeStatus;
  staffNote?: string | null;
  contactNote?: string | null;
  decidedByName?: string | null;
  decidedAt?: string | null;
  completedByName?: string | null;
  completedAt?: string | null;
  returnedToStock?: boolean | null;
  createdAt: string;
  updatedAt: string;
}

function toRequest(doc: PayloadExchangeDoc): ExchangeRequest {
  return {
    id: doc.id,
    schoolId: doc.school,
    userId: typeof doc.user === "string" ? doc.user : doc.user.id,
    orderId: doc.order,
    receiptId: typeof doc.receipt === "string" ? doc.receipt : doc.receipt.id,
    orderItemId: doc.orderItemId,
    uniformItemId: doc.uniformItemId,
    itemLabel: doc.itemLabel,
    fromSize: doc.fromSize,
    toSize: doc.toSize,
    quantity: doc.quantity,
    fromUnitPrice: doc.fromUnitPrice,
    toUnitPrice: doc.toUnitPrice,
    priceDifference: doc.priceDifference,
    reason: doc.reason,
    note: doc.note ?? undefined,
    status: doc.status,
    staffNote: doc.staffNote ?? undefined,
    contactNote: doc.contactNote ?? undefined,
    decidedByName: doc.decidedByName ?? undefined,
    decidedAt: doc.decidedAt ?? undefined,
    completedByName: doc.completedByName ?? undefined,
    completedAt: doc.completedAt ?? undefined,
    returnedToStock: doc.returnedToStock ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toRecord(doc: PayloadExchangeDoc): ExchangeRequestRecord | null {
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
    receiptCode: typeof doc.receipt === "string" ? "" : doc.receipt.qrPayload,
  };
}

/* ------------------------------ student side ------------------------------ */

/** Student — the Exchange tab's "My requests" list and its eligibility check. Newest first. */
export async function getExchangeRequestsByUser(userId: string): Promise<ExchangeRequest[]> {
  const docs = await payloadFind<PayloadExchangeDoc>("exchange-requests", { user: userId }, { sort: "-createdAt" });
  return docs.map(toRequest);
}

export interface CreateExchangeInput {
  orderId: string;
  orderItemId: string;
  toSize: string;
  reason: ExchangeReason;
  note?: string;
  quantity?: number;
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

export async function createExchangeRequest(input: CreateExchangeInput): Promise<void> {
  await postAction("/api/exchange/create", input);
}

export async function cancelExchangeRequest(id: string): Promise<void> {
  await postAction("/api/exchange/transition", { id, action: "cancel" });
}

/* ------------------------------ console side ------------------------------ */

export interface ExchangePageFilters {
  status?: ExchangeStatus | "open";
  search?: string;
  classLevelId?: string;
  fromDate?: string;
  toDate?: string;
}

function buildWhere(schoolId: string, filters: ExchangePageFilters): Record<string, unknown> {
  const and: Record<string, unknown>[] = [{ school: { equals: schoolId } }];
  if (filters.status === "open") and.push({ status: { in: ["pending", "approved"] } });
  else if (filters.status) and.push({ status: { equals: filters.status } });
  const search = filters.search?.trim();
  if (search) {
    and.push({
      or: [
        { "user.name": { contains: search } },
        { "user.username": { contains: search } },
        { "receipt.qrPayload": { contains: search.toUpperCase() } },
        { itemLabel: { contains: search } },
      ],
    });
  }
  if (filters.classLevelId) and.push({ "user.classLevel": { equals: filters.classLevelId } });
  if (filters.fromDate) and.push({ createdAt: { greater_than_equal: `${filters.fromDate}T00:00:00.000Z` } });
  if (filters.toDate) and.push({ createdAt: { less_than_equal: `${filters.toDate}T23:59:59.999Z` } });
  return { and };
}

export interface ExchangePage {
  records: ExchangeRequestRecord[];
  totalCount: number;
  totalPages: number;
  page: number;
}

/** Console — Exchange Requests tab, filtered + paginated server-side. */
export async function getExchangeRequestsPageBySchool(
  schoolId: string,
  filters: ExchangePageFilters,
  page: number,
  pageSize = 20,
): Promise<ExchangePage> {
  const result = await payloadFindPage<PayloadExchangeDoc>("exchange-requests", {
    where: buildWhere(schoolId, filters),
    page,
    limit: pageSize,
    sort: "-createdAt",
    depth: 1,
  });
  const records = result.docs.map(toRecord).filter((r): r is ExchangeRequestRecord => r !== null);
  return { records, totalCount: result.totalDocs, totalPages: result.totalPages, page: result.page };
}

/** Console — every row matching the filters, for CSV export (capped well above any realistic school volume). */
export async function getAllExchangeRequestsBySchool(
  schoolId: string,
  filters: ExchangePageFilters,
): Promise<ExchangeRequestRecord[]> {
  const result = await payloadFindPage<PayloadExchangeDoc>("exchange-requests", {
    where: buildWhere(schoolId, filters),
    page: 1,
    limit: 5000,
    sort: "-createdAt",
    depth: 1,
  });
  return result.docs.map(toRecord).filter((r): r is ExchangeRequestRecord => r !== null);
}

/** Console — nav badge: requests waiting for a decision. Cheap (limit=1; only totalDocs is used). */
export async function getPendingExchangeCount(schoolId: string): Promise<number> {
  const result = await payloadFindPage<PayloadExchangeDoc>("exchange-requests", {
    where: { and: [{ school: { equals: schoolId } }, { status: { equals: "pending" } }] },
    limit: 1,
  });
  return result.totalDocs;
}

export type ExchangeAction = "approve" | "reject" | "cancel" | "complete";

export interface ExchangeActionResult {
  ok: true;
  /** Set on approve when the requested size is running low. */
  warning?: string;
}

export async function transitionExchangeRequest(
  id: string,
  action: ExchangeAction,
  options: { staffNote?: string; returnToStock?: boolean } = {},
): Promise<ExchangeActionResult> {
  return postAction<ExchangeActionResult>("/api/exchange/transition", { id, action, ...options });
}

export async function saveExchangeContactNote(id: string, contactNote: string): Promise<void> {
  await postAction("/api/exchange/transition", { id, action: "note", contactNote });
}
