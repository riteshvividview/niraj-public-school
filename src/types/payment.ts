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
  | {
      type: "razorpay";
      keyId: string;
      orderId: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
      prefill: { name?: string; email?: string; contact?: string };
      timeoutSeconds: number;
    };

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
