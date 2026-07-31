export type RedemptionStatus = "ready" | "collected" | "checked-in";

/** Mirrors the future Payload `receipts` collection. Built in Phase 6. */
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
