import type { CartItem, PaymentAttempt, PaymentConfig, PaymentMethod, StartPaymentResult, CheckoutInstructions } from "@/types";

/**
 * Parent — paying. Everything goes through the server's /api/payments/* routes:
 * the browser sends only WHAT is being bought (never a price), the server prices
 * it, records the payment as "pending" BEFORE any money moves, and issues the
 * order + receipt only once the payment is confirmed. See
 * src/lib/server/payments/service.ts.
 */
async function call<T>(path: string, init?: RequestInit): Promise<{ status: number; ok: boolean; body: T & { error?: string } }> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { status: res.status, ok: res.ok, body };
}

function failIfNotOk<T>(result: { ok: boolean; body: T & { error?: string } }, fallback: string): T {
  if (!result.ok) throw new Error(result.body.error ?? fallback);
  return result.body;
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  return failIfNotOk(await call<PaymentConfig>("/api/payments/config"), "Could not load payment settings.");
}

/** Start (or resume) paying for the cart. A duplicate / another payment in progress comes back as a normal result, not an error. */
export async function startPayment(items: CartItem[]): Promise<StartPaymentResult> {
  const result = await call<{
    status?: "started" | "resumed";
    code?: string;
    payment: PaymentAttempt;
    checkout: CheckoutInstructions;
    amount: number;
    paidAt: string;
    receiptId?: string;
    receiptCode?: string;
  }>("/api/payments/start", {
    method: "POST",
    body: JSON.stringify({ items: items.map((item) => ({ kind: item.kind, refId: item.refId, meta: item.kind === "uniform" ? item.meta : undefined })) }),
  });
  if (result.status === 409 && result.body.code === "duplicate") {
    const { amount, paidAt, receiptId, receiptCode } = result.body;
    return { kind: "duplicate", amount, paidAt, receiptId, receiptCode };
  }
  if (result.status === 409 && result.body.code === "pending") return { kind: "pending", payment: result.body.payment };
  const body = failIfNotOk(result, "We couldn't start the payment. Nothing has been charged.");
  return { kind: "ready", resumed: body.status === "resumed", payment: body.payment, checkout: body.checkout };
}

/** The checkout reports it finished; the server verifies before issuing anything. `proof` is the provider's own fields. */
export async function confirmPayment(paymentId: string, proof: Record<string, unknown>): Promise<PaymentAttempt> {
  return failIfNotOk(
    await call<{ payment: PaymentAttempt }>("/api/payments/confirm", { method: "POST", body: JSON.stringify({ paymentId, ...proof }) }),
    "We couldn't confirm the payment.",
  ).payment;
}

/** TEST MODE only (no real provider connected): plays the gateway. */
export async function simulateGateway(
  paymentId: string,
  outcome: "success" | "failure" | "confirm-later",
  method: PaymentMethod,
): Promise<PaymentAttempt> {
  return failIfNotOk(
    await call<{ payment: PaymentAttempt }>("/api/payments/simulate", { method: "POST", body: JSON.stringify({ paymentId, outcome, method }) }),
    "The test payment failed.",
  ).payment;
}

export async function cancelPayment(paymentId: string): Promise<PaymentAttempt> {
  return failIfNotOk(
    await call<{ payment: PaymentAttempt }>("/api/payments/cancel", { method: "POST", body: JSON.stringify({ paymentId }) }),
    "We couldn't cancel the payment.",
  ).payment;
}

/** Checks ONE payment with the provider right now and returns where it stands. */
export async function checkPaymentStatus(paymentId: string): Promise<PaymentAttempt> {
  return failIfNotOk(
    await call<{ payment: PaymentAttempt }>(`/api/payments/status?id=${encodeURIComponent(paymentId)}`),
    "We couldn't check the payment.",
  ).payment;
}

/** My payments — newest first. The one in progress (if any) is re-checked with the provider first. */
export async function getMyPayments(): Promise<PaymentAttempt[]> {
  return failIfNotOk(await call<{ payments: PaymentAttempt[] }>("/api/payments/status"), "Could not load your payments.").payments;
}
