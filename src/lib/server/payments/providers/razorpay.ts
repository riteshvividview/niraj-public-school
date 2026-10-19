import { createHmac, timingSafeEqual } from "node:crypto";
import type { CheckoutContext, CheckoutInstructions, PaymentProvider, PaymentRow, ProviderOutcome, WebhookEvent } from "../types";

/**
 * Razorpay — Orders API + the hosted (redirect) checkout page.
 * https://razorpay.com/docs/payments/payment-gateway/web-integration/hosted/  ·  Dashboard → Account & Settings.
 *
 * Flow: we create a Razorpay ORDER for the exact amount → the parent's browser POSTs to Razorpay's hosted
 * checkout (UPI / cards / net banking) → Razorpay POSTs the parent back to /api/payments/razorpay/callback,
 * which just sends them on to /checkout/return — AND tells us server-to-server through a webhook. Money is only
 * ever trusted from the ORDER'S PAYMENTS list at Razorpay (a payment that is captured, with the exact amount),
 * never from the browser's return or the webhook body alone. One order can take several attempts (a declined
 * card, then UPI), so a failed attempt leaves the payment pending.
 *
 * Server settings (Razorpay Dashboard):
 *   RAZORPAY_KEY_ID          Settings → API Keys (rzp_test_… in Test Mode, rzp_live_… live)
 *   RAZORPAY_KEY_SECRET      shown once when the key is generated — keep it server-side only
 *   RAZORPAY_WEBHOOK_SECRET  the secret you type when adding the webhook (Settings → Webhooks)
 */
const API = (process.env.RAZORPAY_API_URL || "https://api.razorpay.com/v1").replace(/\/+$/, ""); // the override is for tests only
const CHECKOUT_HOST = "https://api.razorpay.com/v1";
export const RAZORPAY_CHECKOUT_URL = `${CHECKOUT_HOST}/checkout/embedded`;

const keyId = () => process.env.RAZORPAY_KEY_ID ?? "";
const keySecret = () => process.env.RAZORPAY_KEY_SECRET ?? "";
const webhookSecret = () => process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

const toPaise = (rupees: number) => Math.round(rupees * 100);

async function api<T>(path: string, init: RequestInit = {}): Promise<{ status: number; body: T }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  let body: unknown = {};
  try {
    body = JSON.parse(text);
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, body: body as T };
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

const hmac = (secret: string, message: string) => createHmac("sha256", secret).update(message).digest("hex");

interface RzpPayment {
  id: string;
  status: string; // created | authorized | captured | refunded | failed
  amount: number; // paise
  method?: string;
  captured?: boolean;
  error_description?: string | null;
  error_reason?: string | null;
}

const METHOD: Record<string, string> = { upi: "upi", card: "card", netbanking: "netbanking", emi: "card" };

/** The browser-side form that opens Razorpay's hosted checkout for an existing order. */
function checkoutFor(ctx: CheckoutContext, orderId: string): CheckoutInstructions {
  const { payment, student } = ctx;
  const origin = new URL(ctx.returnUrl).origin;
  const description = payment.items.length === 1 ? payment.items[0].label : `${payment.items.length} items`;
  // Razorpay's hosted checkout needs an email and a phone for the payer. Most parents have none on file yet, so
  // the school office's own contact stands in (the parent can change both on Razorpay's page) - payment
  // confirmations then also reach the school.
  const fields: Record<string, string> = {
    key_id: keyId(),
    order_id: orderId,
    amount: String(toPaise(payment.amount)),
    currency: payment.currency || "INR",
    name: ctx.schoolName,
    description,
    callback_url: `${origin}/api/payments/razorpay/callback?payment=${encodeURIComponent(payment.id)}`,
    cancel_url: ctx.returnUrl,
    "notes[paymentId]": payment.id,
    "prefill[name]": student.name,
  };
  const email = student.email || ctx.schoolContact?.email;
  const contact = (student.mobileNumber || ctx.schoolContact?.phone || "").replace(/[^\d+]/g, "");
  if (email) fields["prefill[email]"] = email;
  if (contact) fields["prefill[contact]"] = contact;
  return { type: "post", url: RAZORPAY_CHECKOUT_URL, fields };
}

/** What the order's payment list says, as our outcome. Money counts only when captured with the exact amount. */
async function outcomeOf(payment: PaymentRow, orderId: string): Promise<ProviderOutcome> {
  const res = await api<{ items?: RzpPayment[]; error?: { description?: string } }>(`/orders/${encodeURIComponent(orderId)}/payments`);
  if (res.status === 400 || res.status === 404) return { state: "pending" }; // order not known (yet)
  if (res.status >= 300) throw new Error(`Razorpay ${res.status} while checking order ${orderId}: ${res.body.error?.description ?? ""}`);
  const items = res.body.items ?? [];
  const expected = toPaise(payment.amount);

  for (const item of items) {
    if (item.status !== "captured" && item.status !== "authorized") continue;
    if (item.amount !== expected) {
      console.error(`[payments/razorpay] amount mismatch for ${payment.id}: Razorpay says ${item.amount} paise, expected ${expected} — NOT settling.`);
      return { state: "pending", reason: "The amount reported by Razorpay doesn't match this payment. Please contact the school." };
    }
    let captured = item.status === "captured";
    if (!captured) {
      // The account is set to capture manually: take the authorised money now (safe to repeat).
      const cap = await api<{ status?: string }>(`/payments/${encodeURIComponent(item.id)}/capture`, {
        method: "POST",
        body: JSON.stringify({ amount: expected, currency: payment.currency || "INR" }),
      });
      captured = cap.status < 300 && cap.body.status === "captured";
      if (!captured) return { state: "pending", reason: "The payment is authorised but not captured yet." };
    }
    return { state: "paid", providerPaymentId: item.id, method: METHOD[String(item.method ?? "")] ?? "other" };
  }

  // A failed attempt doesn't end the order — the parent may retry on the payment page — so it stays pending (with the reason).
  const failed = items.filter((item) => item.status === "failed");
  const last = failed[failed.length - 1];
  return { state: "pending", reason: last ? (last.error_description || last.error_reason || "The payment attempt failed.") : undefined };
}

export const razorpayProvider: PaymentProvider = {
  id: "razorpay",
  label: "Razorpay",
  testMode: false,
  isConfigured: () => Boolean(keyId() && keySecret()),

  async createCheckout(ctx) {
    const res = await api<{ id?: string; error?: { description?: string } }>("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: toPaise(ctx.payment.amount),
        currency: ctx.payment.currency || "INR",
        receipt: ctx.payment.id, // 36 chars, within Razorpay's 40
        notes: { paymentId: ctx.payment.id, student: ctx.student.name.slice(0, 100) },
      }),
    });
    if (res.status >= 300 || !res.body.id) throw new Error(`Razorpay ${res.status}: ${res.body.error?.description ?? "no order id returned"}`);
    return { providerOrderId: res.body.id, checkout: checkoutFor(ctx, res.body.id) };
  },

  /** The same order stays open for more attempts, so resuming is just opening its checkout page again. */
  async resumeCheckout(ctx) {
    const orderId = ctx.payment.providerOrderId;
    if (!orderId) throw new Error("This payment has no Razorpay order to resume.");
    return checkoutFor(ctx, orderId);
  },

  /**
   * The callback's signature (HMAC of order|payment with the key secret) says the page really came from
   * Razorpay; either way the money is then confirmed by asking Razorpay. A wrong signature is rejected.
   */
  async verifyClientConfirmation(payment, payload): Promise<ProviderOutcome | null> {
    const paymentId = typeof payload.razorpay_payment_id === "string" ? payload.razorpay_payment_id : "";
    const signature = typeof payload.razorpay_signature === "string" ? payload.razorpay_signature : "";
    if (paymentId || signature) {
      const orderId = payment.providerOrderId ?? "";
      if (!orderId || !paymentId || !signature || !safeEqual(hmac(keySecret(), `${orderId}|${paymentId}`), signature)) return null;
    }
    return this.fetchStatus(payment);
  },

  async fetchStatus(payment: PaymentRow): Promise<ProviderOutcome> {
    if (!payment.providerOrderId) return { state: "pending" };
    return outcomeOf(payment, payment.providerOrderId);
  },

  verifyWebhook(rawBody, headers): WebhookEvent | null {
    const secret = webhookSecret();
    const signature = headers.get("x-razorpay-signature") ?? "";
    if (!secret || !signature || !safeEqual(hmac(secret, rawBody), signature)) return null;
    let body: {
      event?: string;
      payload?: { payment?: { entity?: RzpPayment & { order_id?: string } }; order?: { entity?: { id?: string } } };
    };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return null;
    }
    const entity = body.payload?.payment?.entity;
    const orderId = entity?.order_id ?? body.payload?.order?.entity?.id;
    if (!orderId) return { outcome: { state: "pending" } };
    // The body only says WHICH order to look at and whether it claims success; the service re-reads the
    // order's payments from Razorpay before it settles anything.
    if (body.event === "payment.captured" || body.event === "order.paid") {
      return { providerOrderId: orderId, outcome: { state: "paid", providerPaymentId: entity?.id ?? orderId, method: METHOD[String(entity?.method ?? "")] ?? "other" } };
    }
    return {
      providerOrderId: orderId,
      outcome: { state: "pending", reason: body.event === "payment.failed" ? (entity?.error_description || "The payment attempt failed.") : undefined },
    };
  },
};
