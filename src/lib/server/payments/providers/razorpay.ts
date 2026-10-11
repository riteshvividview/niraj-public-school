import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentProvider, PaymentRow, ProviderOutcome, WebhookEvent } from "../types";

/**
 * Razorpay (https://razorpay.com/docs/api/). No SDK — plain fetch + node:crypto.
 * Needs RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET (set the
 * same secret in Razorpay Dashboard → Webhooks, pointing at /api/payments/webhook,
 * with the events payment.captured, order.paid and payment.failed). Enable
 * auto-capture in the dashboard so a successful payment is "captured".
 */
const API = "https://api.razorpay.com/v1";

const keyId = () => process.env.RAZORPAY_KEY_ID ?? "";
const keySecret = () => process.env.RAZORPAY_KEY_SECRET ?? "";
const webhookSecret = () => process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

function authHeader(): string {
  return `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString("base64")}`;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: authHeader(), "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    const description = (json as { error?: { description?: string } } | null)?.error?.description;
    throw new Error(`Razorpay ${res.status}: ${description ?? text.slice(0, 200)}`);
  }
  return json as T;
}

function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

const hmacHex = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("hex");

interface RzpPayment {
  id: string;
  order_id?: string;
  status: string;
  method?: string;
  error_description?: string | null;
  notes?: Record<string, string> | unknown[];
}

const outcomeOf = (p: RzpPayment): ProviderOutcome =>
  p.status === "captured"
    ? { state: "paid", providerPaymentId: p.id, method: p.method }
    : { state: "pending", reason: p.status === "failed" ? (p.error_description ?? "The payment attempt failed.") : undefined };

export const razorpayProvider: PaymentProvider = {
  id: "razorpay",
  label: "Razorpay",
  testMode: false,
  isConfigured: () => Boolean(keyId() && keySecret()),

  async createCheckout({ payment, timeoutSeconds, student, schoolName }) {
    const order = await api<{ id: string }>("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: Math.round(payment.amount * 100),
        currency: payment.currency,
        receipt: payment.id.slice(0, 40),
        notes: { payment_id: payment.id },
      }),
    });
    const checkout = this.resumeCheckout({ payment: { ...payment, providerOrderId: order.id }, student, schoolName, timeoutSeconds });
    return { providerOrderId: order.id, checkout };
  },

  resumeCheckout({ payment, student, schoolName, timeoutSeconds }) {
    return {
      type: "razorpay",
      keyId: keyId(),
      orderId: payment.providerOrderId ?? "",
      amount: Math.round(payment.amount * 100),
      currency: payment.currency,
      name: schoolName,
      description: payment.items.length === 1 ? payment.items[0].label : `${payment.items.length} items`,
      prefill: { name: student.name, email: student.email, contact: student.mobileNumber },
      timeoutSeconds,
    };
  },

  async verifyClientConfirmation(payment, payload) {
    const paymentId = String(payload.razorpay_payment_id ?? "");
    const orderId = String(payload.razorpay_order_id ?? "");
    const signature = String(payload.razorpay_signature ?? "");
    if (!paymentId || !orderId || !signature || orderId !== payment.providerOrderId) return null;
    if (!safeEqualHex(hmacHex(keySecret(), `${orderId}|${paymentId}`), signature)) return null;
    // The signature proves the checkout finished; ask Razorpay for the authoritative state.
    const p = await api<RzpPayment>(`/payments/${encodeURIComponent(paymentId)}`);
    if (p.order_id !== orderId) return null;
    return outcomeOf(p);
  },

  async fetchStatus(payment: PaymentRow): Promise<ProviderOutcome> {
    if (!payment.providerOrderId) return { state: "pending" };
    const list = await api<{ items: RzpPayment[] }>(`/orders/${encodeURIComponent(payment.providerOrderId)}/payments`);
    const captured = list.items.find((p) => p.status === "captured");
    if (captured) return outcomeOf(captured);
    const lastFailed = [...list.items].reverse().find((p) => p.status === "failed");
    return { state: "pending", reason: lastFailed?.error_description ?? undefined };
  },

  verifyWebhook(rawBody, headers): WebhookEvent | null {
    const signature = headers.get("x-razorpay-signature") ?? "";
    if (!webhookSecret() || !signature || !safeEqualHex(hmacHex(webhookSecret(), rawBody), signature)) return null;
    let body: { event?: string; payload?: { payment?: { entity?: RzpPayment } } };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return null;
    }
    const entity = body.payload?.payment?.entity;
    if (!entity) return { outcome: { state: "pending" } };
    const notes = entity.notes && !Array.isArray(entity.notes) ? (entity.notes as Record<string, string>) : {};
    return {
      providerOrderId: entity.order_id,
      paymentId: notes.payment_id,
      outcome:
        body.event === "payment.failed"
          ? { state: "pending", reason: entity.error_description ?? "The payment attempt failed." }
          : outcomeOf(entity),
    };
  },
};
