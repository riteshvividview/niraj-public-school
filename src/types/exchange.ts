export type ExchangeStatus = "pending" | "approved" | "rejected" | "cancelled" | "completed";
export type ExchangeReason = "size-too-small" | "size-too-large" | "defect" | "other";

/**
 * Mirrors the Payload `exchange-requests` collection — a parent's request to
 * swap one collected uniform line for a different size. The original order
 * and receipt are never modified; this row is the exchange's own history.
 * Items/sizes/prices are snapshots taken at request time.
 */
export interface ExchangeRequest {
  id: string;
  schoolId: string;
  userId: string;
  orderId: string;
  receiptId: string;
  /** `orders_items` row id of the line being exchanged. */
  orderItemId: string;
  uniformItemId: string;
  itemLabel: string;
  fromSize: string;
  toSize: string;
  quantity: number;
  fromUnitPrice: number;
  toUnitPrice: number;
  /** (toUnitPrice − fromUnitPrice) × quantity, settled at the school counter. */
  priceDifference: number;
  reason: ExchangeReason;
  note?: string;
  status: ExchangeStatus;
  staffNote?: string;
  /** Free-text log of calls/conversations staff had with the family — staff-only. */
  contactNote?: string;
  decidedByName?: string;
  decidedAt?: string;
  completedByName?: string;
  completedAt?: string;
  returnedToStock?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Console view: the request plus who asked and which receipt it belongs to. */
export interface ExchangeRequestRecord extends ExchangeRequest {
  student: {
    name: string;
    registerNumber: string;
    classLevelId: string;
    section?: string;
    mobileNumber?: string;
    email?: string;
  };
  receiptCode: string;
}
