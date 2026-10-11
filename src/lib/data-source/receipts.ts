import { groupItemsByKind } from "@/lib/cart-items";
import { toAddress, type PayloadAddressGroup } from "./address-mapper";
import type { Order, PaymentRecord, Receipt, ReceiptRecord, RedemptionStatus } from "@/types";
import { toOrderParts, type PayloadOrderPart } from "./order-parts-mapper";
import { payloadCreate, payloadFind, payloadFindById, payloadFindPage, payloadUpdate } from "./payload-rest";

interface PayloadOrderItem {
  id: string;
  kind: string;
  refId: string;
  label: string;
  meta?: string | null;
  unitPrice: number;
  quantity: number;
  collectedAt?: string | null;
  parts?: PayloadOrderPart[] | null;
}

interface PayloadOrderDoc {
  id: string;
  user: string;
  school: string;
  items: PayloadOrderItem[];
  totalAmount: number;
  paymentMethod: Order["paymentMethod"];
  status: Order["status"];
  createdAt: string;
  updatedAt: string;
}

interface PayloadUserRef {
  id: string;
  name: string;
  username: string;
  classLevel: string;
  section?: string | null;
  mobileNumber?: string | null;
  address?: PayloadAddressGroup | null;
}

interface PayloadReceiptDoc {
  id: string;
  /** Populated (an object) at depth=1, a plain id string at depth=0. */
  order: string | PayloadOrderDoc;
  /** Same depth=1 populated-vs-id-string rule as `order`. */
  user: string | PayloadUserRef;
  school: string;
  qrPayload: string;
  redemptionStatus: RedemptionStatus;
  issuedAt: string;
  redeemedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

function userId(user: string | PayloadUserRef): string {
  return typeof user === "string" ? user : user.id;
}

function toOrderItems(items: PayloadOrderDoc["items"]): Order["items"] {
  return items.map((item) => ({
    id: item.id,
    kind: item.kind as Order["items"][number]["kind"],
    refId: item.refId,
    label: item.label,
    meta: item.meta ?? undefined,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    collectedAt: item.collectedAt ?? null,
    parts: toOrderParts(item.parts),
  }));
}

function toOrder(doc: PayloadOrderDoc): Order {
  return {
    id: doc.id,
    userId: doc.user,
    schoolId: doc.school,
    items: toOrderItems(doc.items),
    totalAmount: doc.totalAmount,
    paymentMethod: doc.paymentMethod,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toReceiptRecord(doc: PayloadReceiptDoc): ReceiptRecord | null {
  if (typeof doc.order === "string") return null; // needs depth=1 to be usable
  const receipt: Receipt = {
    id: doc.id,
    orderId: doc.order.id,
    userId: userId(doc.user),
    schoolId: doc.school,
    qrPayload: doc.qrPayload,
    redemptionStatus: doc.redemptionStatus,
    issuedAt: doc.issuedAt,
    redeemedAt: doc.redeemedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
  return { order: toOrder(doc.order), receipt };
}

// Excludes visually-ambiguous characters (0/O, 1/I) — this code is meant to
// be read off a screen and typed in by hand at a counter.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateReceiptCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Checkout — issued right after createOrder for the same order. */
export async function createReceiptForOrder(order: Order): Promise<Receipt> {
  const now = new Date().toISOString();
  const qrPayload = generateReceiptCode();
  const doc = await payloadCreate<PayloadReceiptDoc & { order: string }>("receipts", {
    order: order.id,
    user: order.userId,
    school: order.schoolId,
    qrPayload,
    redemptionStatus: "ready",
    issuedAt: now,
  });
  return {
    id: doc.id,
    orderId: order.id,
    userId: order.userId,
    schoolId: order.schoolId,
    qrPayload,
    redemptionStatus: "ready",
    issuedAt: now,
    redeemedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Parent — Home page's "you have receipts" banner. Cheap existence check, not a full fetch. */
export async function hasAnyReceiptsForUser(userId: string): Promise<boolean> {
  const page = await payloadFindPage<PayloadReceiptDoc>("receipts", {
    where: { user: { equals: userId } },
    limit: 1,
  });
  return page.totalDocs > 0;
}

/**
 * Parent — Program detail page's "already registered?" check. Queries
 * `receipts` directly with a dot-path filter into the populated `order`
 * relation (same technique `getPaymentsPageBySchool` already uses for
 * `"user.classLevel"`), `limit: 1`, so this doesn't need to pull the
 * student's whole receipt history just to find one match.
 */
export async function getExistingReceiptIdForProgram(userId: string, programId: string): Promise<string | null> {
  const page = await payloadFindPage<PayloadReceiptDoc>("receipts", {
    where: {
      and: [{ user: { equals: userId } }, { "order.items.refId": { equals: programId } }],
    },
    limit: 1,
  });
  return page.docs[0]?.id ?? null;
}

export interface ReceiptsPage {
  records: ReceiptRecord[];
  totalCount: number;
  totalPages: number;
  page: number;
}

/** Parent — My Receipts list, paginated server-side — a student's purchase history grows every year of enrollment. */
export async function getReceiptsPageByUser(userId: string, page: number, pageSize = 20): Promise<ReceiptsPage> {
  const result = await payloadFindPage<PayloadReceiptDoc>("receipts", {
    where: { user: { equals: userId } },
    page,
    limit: pageSize,
    sort: "-issuedAt",
    depth: 1,
  });
  const records = result.docs.map(toReceiptRecord).filter((record): record is ReceiptRecord => record !== null);
  return { records, totalCount: result.totalDocs, totalPages: result.totalPages, page: result.page };
}

/** Console — Student Detail page's purchase history (one student, inherently bounded). Parent-facing list uses getReceiptsPageByUser instead. */
export async function getReceiptsByUser(userId: string): Promise<ReceiptRecord[]> {
  const docs = await payloadFind<PayloadReceiptDoc>("receipts", { user: userId }, { depth: 1 });
  return docs
    .map(toReceiptRecord)
    .filter((record): record is ReceiptRecord => record !== null)
    .sort((a, b) => b.receipt.issuedAt.localeCompare(a.receipt.issuedAt));
}

/** Console — Reports Dashboard / Receipt Scanner. */
export async function getReceiptsBySchool(schoolId: string): Promise<ReceiptRecord[]> {
  const docs = await payloadFind<PayloadReceiptDoc>("receipts", { school: schoolId }, { depth: 1 });
  return docs
    .map(toReceiptRecord)
    .filter((record): record is ReceiptRecord => record !== null)
    .sort((a, b) => b.receipt.issuedAt.localeCompare(a.receipt.issuedAt));
}

/**
 * Console — Payments page. Same query as getReceiptsBySchool, but also
 * carries the paying student's identity — depth=1 already returns `user`
 * fully populated (confirmed live: name/username/classLevel/section all
 * present), so this costs nothing extra over getReceiptsBySchool.
 */
export async function getPaymentsBySchool(schoolId: string): Promise<PaymentRecord[]> {
  const docs = await payloadFind<PayloadReceiptDoc>("receipts", { school: schoolId }, { depth: 1 });
  const records: PaymentRecord[] = [];
  for (const doc of docs) {
    const record = toReceiptRecord(doc);
    if (!record || typeof doc.user === "string") continue; // needs depth=1 to be usable
    records.push({
      ...record,
      studentName: doc.user.name,
      registerNumber: doc.user.username,
      classLevelId: doc.user.classLevel,
      section: doc.user.section ?? undefined,
      address: toAddress(doc.user.address),
      studentPhone: doc.user.mobileNumber ?? undefined,
    });
  }
  return records.sort((a, b) => b.receipt.issuedAt.localeCompare(a.receipt.issuedAt));
}

export interface PaymentPageFilters {
  search?: string;
  classLevelId?: string;
  section?: string;
  redemptionStatus?: RedemptionStatus;
  /**
   * Broader than `redemptionStatus` — "collected" matches any of
   * partially-collected/collected/checked-in, "pending" matches exactly
   * "ready". Used by the Reports Dashboard's Orders drill-down, which deals
   * in Collected vs. Awaiting Collection rather than one exact status.
   * Ignored if `redemptionStatus` is also set.
   */
  collectionState?: "collected" | "pending";
  paymentMethod?: Order["paymentMethod"];
  fromDate?: string;
  toDate?: string;
}

export interface PaymentsPage {
  records: PaymentRecord[];
  totalCount: number;
  totalPages: number;
  page: number;
}

/**
 * Console — Payments page, paginated + filtered server-side. `search` and
 * every filter become a Payload `where` clause — including dot-path queries
 * through the `order` and `user` relations (confirmed working against this
 * project's Payload REST API) — so a growing receipts collection only ever
 * transfers one page at a time instead of the whole ledger.
 */
export async function getPaymentsPageBySchool(
  schoolId: string,
  filters: PaymentPageFilters,
  page: number,
  pageSize = 20,
  sort: "issuedAt" | "-issuedAt" = "-issuedAt",
): Promise<PaymentsPage> {
  const and: Record<string, unknown>[] = [{ school: { equals: schoolId } }];
  const search = filters.search?.trim();
  if (search) {
    and.push({
      or: [
        { "user.name": { contains: search } },
        { "user.username": { contains: search } },
        { qrPayload: { contains: search.toUpperCase() } },
      ],
    });
  }
  if (filters.classLevelId) and.push({ "user.classLevel": { equals: filters.classLevelId } });
  if (filters.section) and.push({ "user.section": { equals: filters.section } });
  if (filters.redemptionStatus) {
    and.push({ redemptionStatus: { equals: filters.redemptionStatus } });
  } else if (filters.collectionState === "collected") {
    and.push({ redemptionStatus: { not_equals: "ready" } });
  } else if (filters.collectionState === "pending") {
    and.push({ redemptionStatus: { equals: "ready" } });
  }
  if (filters.paymentMethod) and.push({ "order.paymentMethod": { equals: filters.paymentMethod } });
  if (filters.fromDate) and.push({ issuedAt: { greater_than_equal: `${filters.fromDate}T00:00:00.000Z` } });
  if (filters.toDate) and.push({ issuedAt: { less_than_equal: `${filters.toDate}T23:59:59.999Z` } });

  const result = await payloadFindPage<PayloadReceiptDoc>("receipts", {
    where: { and },
    page,
    limit: pageSize,
    sort,
    depth: 1,
  });
  const records: PaymentRecord[] = [];
  for (const doc of result.docs) {
    const record = toReceiptRecord(doc);
    if (!record || typeof doc.user === "string") continue;
    records.push({
      ...record,
      studentName: doc.user.name,
      registerNumber: doc.user.username,
      classLevelId: doc.user.classLevel,
      section: doc.user.section ?? undefined,
      address: toAddress(doc.user.address),
      studentPhone: doc.user.mobileNumber ?? undefined,
    });
  }
  return { records, totalCount: result.totalDocs, totalPages: result.totalPages, page: result.page };
}

export interface ReceiptStats {
  totalOrders: number;
  redeemed: number;
  pending: number;
  totalRevenue: number;
  categoryRevenue: { books: number; uniform: number; programs: number };
}

interface PayloadStatsReceiptDoc {
  order: { totalAmount: number; items: PayloadOrderDoc["items"] };
}

/**
 * Console — Reports Dashboard. The redeemed/pending counts come from
 * Payload's `totalDocs` on two limit=1 queries (cheap — no document bodies
 * transferred), and the revenue figures come from a single `select`-trimmed
 * query that only pulls each receipt's `order` field, not the rest of the
 * receipt or its populated user — a school's all-time receipt count is
 * expected to stay in the low thousands, so one bounded, field-trimmed
 * fetch is the right tradeoff here (unlike Students/Payments, this page
 * doesn't need per-row detail, only a sum).
 */
export async function getReceiptStatsBySchool(schoolId: string): Promise<ReceiptStats> {
  const [totalPage, redeemedPage, revenueDocs] = await Promise.all([
    payloadFindPage<PayloadReceiptDoc>("receipts", { where: { school: { equals: schoolId } }, limit: 1 }),
    payloadFindPage<PayloadReceiptDoc>("receipts", {
      where: { and: [{ school: { equals: schoolId } }, { redemptionStatus: { not_equals: "ready" } }] },
      limit: 1,
    }),
    payloadFind<PayloadStatsReceiptDoc>(
      "receipts",
      { school: schoolId },
      { depth: 1, limit: 5000, "select[order]": "true" },
    ),
  ]);

  const categoryRevenue = { books: 0, uniform: 0, programs: 0 };
  let totalRevenue = 0;
  revenueDocs.forEach((doc) => {
    totalRevenue += doc.order.totalAmount;
    const grouped = groupItemsByKind(toOrderItems(doc.order.items));
    categoryRevenue.books += grouped.books.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    categoryRevenue.uniform += grouped.uniform.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    categoryRevenue.programs += grouped.programs.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  });

  return {
    totalOrders: totalPage.totalDocs,
    redeemed: redeemedPage.totalDocs,
    pending: totalPage.totalDocs - redeemedPage.totalDocs,
    totalRevenue,
    categoryRevenue,
  };
}

export async function getReceiptById(id: string): Promise<ReceiptRecord | null> {
  const doc = await payloadFindById<PayloadReceiptDoc>("receipts", id, 1);
  return doc ? toReceiptRecord(doc) : null;
}

/** Console — Receipt / QR Scanner's manual code lookup. Includes who the receipt belongs to and their delivery address. */
export async function getReceiptByCode(schoolId: string, code: string): Promise<PaymentRecord | ReceiptRecord | null> {
  const docs = await payloadFind<PayloadReceiptDoc>(
    "receipts",
    { school: schoolId, qrPayload: code.trim().toUpperCase() },
    { depth: 1 },
  );
  const [doc] = docs;
  if (!doc) return null;
  const record = toReceiptRecord(doc);
  if (!record) return null;
  if (typeof doc.user === "string") return record;
  return {
    ...record,
    studentName: doc.user.name,
    registerNumber: doc.user.username,
    classLevelId: doc.user.classLevel,
    section: doc.user.section ?? undefined,
    address: toAddress(doc.user.address),
    studentPhone: doc.user.mobileNumber ?? undefined,
  };
}

/**
 * Console — Receipt / QR Scanner. Returns null if the receipt doesn't exist
 * or isn't in "ready" state (already redeemed) — callers decide how to
 * present that (invalid vs. already-redeemed) rather than this function
 * throwing, since both are normal, expected scan outcomes.
 */
export async function markReceiptRedeemed(
  id: string,
  status: RedemptionStatus,
): Promise<ReceiptRecord | null> {
  const existing = await getReceiptById(id);
  if (!existing || existing.receipt.redemptionStatus !== "ready") return null;
  const redeemedAt = new Date().toISOString();
  await payloadUpdate("receipts", id, { redemptionStatus: status, redeemedAt });
  return {
    order: existing.order,
    receipt: { ...existing.receipt, redemptionStatus: status, redeemedAt },
  };
}
