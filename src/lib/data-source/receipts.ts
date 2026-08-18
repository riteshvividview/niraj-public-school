import type { Order, PaymentRecord, Receipt, ReceiptRecord, RedemptionStatus } from "@/types";
import { payloadCreate, payloadFind, payloadFindById, payloadUpdate } from "./payload-rest";

interface PayloadOrderDoc {
  id: string;
  user: string;
  school: string;
  items: {
    kind: string;
    refId: string;
    label: string;
    meta?: string | null;
    unitPrice: number;
    quantity: number;
  }[];
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

function toOrder(doc: PayloadOrderDoc): Order {
  return {
    id: doc.id,
    userId: doc.user,
    schoolId: doc.school,
    items: doc.items.map((item) => ({
      id: `${item.kind}-${item.refId}`,
      kind: item.kind as Order["items"][number]["kind"],
      refId: item.refId,
      label: item.label,
      meta: item.meta ?? undefined,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    })),
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

/** Parent — My Receipts list. */
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
    });
  }
  return records.sort((a, b) => b.receipt.issuedAt.localeCompare(a.receipt.issuedAt));
}

export async function getReceiptById(id: string): Promise<ReceiptRecord | null> {
  const doc = await payloadFindById<PayloadReceiptDoc>("receipts", id, 1);
  return doc ? toReceiptRecord(doc) : null;
}

/** Console — Receipt / QR Scanner's manual code lookup. */
export async function getReceiptByCode(schoolId: string, code: string): Promise<ReceiptRecord | null> {
  const docs = await payloadFind<PayloadReceiptDoc>(
    "receipts",
    { school: schoolId, qrPayload: code.trim().toUpperCase() },
    { depth: 1 },
  );
  const [doc] = docs;
  return doc ? toReceiptRecord(doc) : null;
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
