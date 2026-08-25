import type { Order } from "./order";

export type RedemptionStatus = "ready" | "partially-collected" | "collected" | "checked-in";

/** Mirrors the Payload `receipts` collection. */
export interface Receipt {
  id: string;
  orderId: string;
  userId: string;
  schoolId: string;
  /** String encoded into the receipt's QR code (e.g. the receipt id). */
  qrPayload: string;
  redemptionStatus: RedemptionStatus;
  issuedAt: string;
  redeemedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A receipt with its underlying order populated — the shape every receipts UI actually renders. */
export interface ReceiptRecord {
  order: Order;
  receipt: Receipt;
}

/** A ReceiptRecord plus the paying student's identity — console Payments page only (a student never needs their own name attached). */
export interface PaymentRecord extends ReceiptRecord {
  studentName: string;
  registerNumber: string;
  classLevelId: string;
  section?: string;
}
