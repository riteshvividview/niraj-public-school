import type { CartItem } from "./cart";

export type PaymentMethod = "upi" | "card" | "netbanking";
export type OrderStatus = "paid" | "pending" | "failed" | "refunded";

/** Mirrors the future Payload `orders` collection. Built in Phase 6. */
export interface Order {
  id: string;
  userId: string;
  schoolId: string;
  items: CartItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}
