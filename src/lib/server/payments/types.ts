/**
 * Server-only. Shared shapes for the payment layer.
 *
 * The app talks to money only through a PaymentProvider (simulated today,
 * Razorpay ready for the keys). Everything else — pricing, duplicate checks,
 * the pending/paid life cycle, creating the order + receipt — is provider-neutral
 * and lives in service.ts.
 */
export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "expired";
export type PaymentKind = "book" | "uniform" | "program";

export interface PaymentItem {
  kind: PaymentKind;
  refId: string;
  label: string;
  meta?: string;
  unitPrice: number;
  quantity: number;
}

/** A row of the `payments` collection, with ids flattened. */
export interface PaymentRow {
  id: string;
  schoolId: string;
  userId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  method?: string;
  provider: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  itemsFingerprint: string;
  items: PaymentItem[];
  expiresAt?: string;
  failureReason?: string;
  completedAt?: string;
  orderId?: string;
  lateSuccess: boolean;
  needsReview: boolean;
  reviewNote?: string;
  createdAt: string;
}

/** What the provider says about a payment right now. */
export type ProviderOutcome =
  | { state: "paid"; providerPaymentId: string; method?: string }
  | { state: "failed"; reason: string }
  | { state: "pending"; reason?: string };

/** What the browser must do to take the money. */
export type CheckoutInstructions =
  | { type: "simulated" }
  | {
      type: "razorpay";
      keyId: string;
      orderId: string;
      /** Smallest currency unit (paise). */
      amount: number;
      currency: string;
      name: string;
      description: string;
      prefill: { name?: string; email?: string; contact?: string };
      timeoutSeconds: number;
    };

export interface CheckoutContext {
  payment: PaymentRow;
  student: { name: string; email?: string; mobileNumber?: string };
  schoolName: string;
  timeoutSeconds: number;
}

export interface WebhookEvent {
  /** The provider's order id the event is about. */
  providerOrderId?: string;
  /** Our own payment id, when the provider echoes it back. */
  paymentId?: string;
  outcome: ProviderOutcome;
}

export interface PaymentProvider {
  id: string;
  label: string;
  /** True while no real money moves (the simulated provider). */
  testMode: boolean;
  isConfigured(): boolean;
  /** Registers the payment with the provider; returns its order id and the browser instructions. */
  createCheckout(ctx: CheckoutContext): Promise<{ providerOrderId: string; checkout: CheckoutInstructions }>;
  /** Browser instructions for a payment that is already registered (resuming a pending one) — no network. */
  resumeCheckout(ctx: CheckoutContext): CheckoutInstructions;
  /** The browser says "paid" — verify that claim (signature / provider lookup). null = does not verify. */
  verifyClientConfirmation(payment: PaymentRow, payload: Record<string, unknown>): Promise<ProviderOutcome | null>;
  /** Ask the provider what happened to this payment. */
  fetchStatus(payment: PaymentRow): Promise<ProviderOutcome>;
  /** Authenticate and parse a webhook delivery. null = not authentic / not ours. */
  verifyWebhook(rawBody: string, headers: Headers): WebhookEvent | null;
}
