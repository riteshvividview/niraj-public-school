export type PaymentAttemptStatus = "pending" | "paid" | "failed" | "cancelled" | "expired";

/**
 * One try at paying — what the parent sees under "My payments". Mirrors the
 * `payments` collection as served by /api/payments/*. A confirmed one carries
 * the receipt it produced.
 */
export interface PaymentAttempt {
  id: string;
  status: PaymentAttemptStatus;
  amount: number;
  currency: string;
  method?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  failureReason?: string;
  /** Confirmed after the attempt had already ended. */
  lateSuccess: boolean;
  items: Array<{ kind: string; label: string; meta?: string; unitPrice: number; quantity: number }>;
  receipt?: { id: string; code: string };
  /** Staff-only. */
  needsReview?: boolean;
  reviewNote?: string;
}

/** What the browser must do to take the money — decided by the server / provider. */
export type CheckoutInstructions =
  | { type: "simulated" }
  /** Send the parent to the bank's hosted payment page; they come back to /checkout/return. */
  | { type: "redirect"; url: string }
  /** Submit a form (POST) to the provider's hosted payment page; they come back to /checkout/return. */
  | { type: "post"; url: string; fields: Record<string, string> };

export interface PaymentConfig {
  provider: string;
  label: string;
  /** True while no real money moves. */
  testMode: boolean;
  available: boolean;
}

export type StartPaymentResult =
  | { kind: "ready"; resumed: boolean; payment: PaymentAttempt; checkout: CheckoutInstructions }
  | { kind: "duplicate"; amount: number; paidAt: string; receiptId?: string; receiptCode?: string }
  | { kind: "pending"; payment: PaymentAttempt };
