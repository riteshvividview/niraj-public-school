import type { CartItem } from "./cart";

export type PaymentMethod = "upi" | "card" | "netbanking";
export type OrderStatus = "paid" | "pending" | "failed" | "refunded";

/**
 * An order line once persisted — `id` is the real Payload `orders_items`
 * row id (stable, used as the PATCH target for marking collection), not
 * the synthetic `${kind}-${refId}` cart-line id CartItem uses pre-checkout.
 */
export interface OrderItem extends CartItem {
  collectedAt: string | null;
  /**
   * Book sets only: what is inside the set, copied onto the order when it was
   * placed, each with its own collected state. Absent for other lines.
   */
  parts?: OrderItemPart[];
}

/** One item inside a purchased book set. */
export interface OrderItemPart {
  id: string;
  section: "textbook" | "notebook" | "stationery";
  subject?: string;
  name: string;
  publisher?: string;
  detail?: string;
  quantity: number;
  starred: boolean;
  collectedAt: string | null;
}

/** Mirrors the future Payload `orders` collection. Built in Phase 6. */
export interface Order {
  id: string;
  userId: string;
  schoolId: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}
