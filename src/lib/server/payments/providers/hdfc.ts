import { timingSafeEqual } from "node:crypto";
import type { CheckoutContext, PaymentProvider, PaymentRow, ProviderOutcome, WebhookEvent } from "../types";

/**
 * HDFC Bank SmartGateway (Juspay-powered) — hosted payment page.
 * https://docs.juspay.in  ·  HDFC SmartGateway dashboard → Settings.
 *
 * Flow: we create a "session" for an order → the parent is sent to HDFC's payment
 * page → HDFC sends them back to `return_url` AND tells us server-to-server via a
 * webhook. Money is only ever trusted from the ORDER STATUS API (status CHARGED and
 * the amount matching), never from the browser's return URL or the webhook body alone.
 *
 * Server settings (all from the HDFC SmartGateway dashboard):
 *   HDFC_API_KEY                   API key (used as the Basic-auth username)
 *   HDFC_MERCHANT_ID               merchant id (sent as x-merchantid)
 *   HDFC_PAYMENT_PAGE_CLIENT_ID    payment page client id
 *   HDFC_WEBHOOK_USERNAME / HDFC_WEBHOOK_PASSWORD   the Basic-auth pair you set on the webhook
 *   HDFC_BASE_URL                  optional; defaults to production. UAT/sandbox:
 *                                  https://smartgateway.hdfcuat.bank.in
 */
const DEFAULT_BASE = "https://smartgateway.hdfcbank.com";

const apiKey = () => process.env.HDFC_API_KEY ?? "";
const merchantId = () => process.env.HDFC_MERCHANT_ID ?? "";
const clientId = () => process.env.HDFC_PAYMENT_PAGE_CLIENT_ID ?? "";
const webhookUser = () => process.env.HDFC_WEBHOOK_USERNAME ?? "";
const webhookPass = () => process.env.HDFC_WEBHOOK_PASSWORD ?? "";
const baseUrl = () => (process.env.HDFC_BASE_URL || DEFAULT_BASE).replace(/\/+$/, "");

async function api<T>(path: string, init: RequestInit & { customerId?: string } = {}): Promise<{ status: number; body: T }> {
  const { customerId, ...rest } = init;
  const res = await fetch(`${baseUrl()}${path}`, {
    ...rest,
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey()}:`).toString("base64")}`,
      "x-merchantid": merchantId(),
      ...(customerId ? { "x-customerid": customerId } : {}),
      "Content-Type": "application/json",
      version: "2023-06-30",
      ...(rest.headers ?? {}),
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

/** HDFC / Juspay order ids are short and alphanumeric, so ours is a compact form of the payment id. */
export const hdfcOrderIdFor = (paymentId: string) => `NPS${paymentId.replace(/-/g, "").slice(0, 18)}`;

interface JuspayOrder {
  order_id?: string;
  status?: string;
  txn_id?: string;
  amount?: number | string;
  payment_method_type?: string;
  payment_method?: string;
  txn_detail?: { error_message?: string | null; status?: string };
  error_message?: string;
  error_code?: string;
}

const METHOD: Record<string, string> = { UPI: "upi", CARD: "card", NB: "netbanking" };

/** What the order status API says, as our outcome. Money counts only as CHARGED with the exact amount. */
function outcomeOf(order: JuspayOrder, payment: PaymentRow): ProviderOutcome {
  if (order.status === "CHARGED") {
    const paid = Number(order.amount);
    if (!Number.isFinite(paid) || Math.abs(paid - payment.amount) > 0.001) {
      console.error(`[payments/hdfc] amount mismatch for ${payment.id}: HDFC says ${String(order.amount)}, expected ${payment.amount} — NOT settling.`);
      return { state: "pending", reason: "The amount reported by the bank doesn't match this payment. Please contact the school." };
    }
    return {
      state: "paid",
      providerPaymentId: order.txn_id || order.order_id || payment.providerOrderId || payment.id,
      method: METHOD[String(order.payment_method_type ?? "").toUpperCase()] ?? "other",
    };
  }
  // A failed attempt doesn't end the order — the parent may retry on the payment page — so it stays pending (with the reason).
  const failed = ["AUTHENTICATION_FAILED", "AUTHORIZATION_FAILED", "JUSPAY_DECLINED"].includes(String(order.status));
  return { state: "pending", reason: failed ? (order.txn_detail?.error_message ?? order.error_message ?? "The payment attempt failed.") : undefined };
}

async function createSession(ctx: CheckoutContext, orderId: string): Promise<string> {
  const { payment, student } = ctx;
  const [firstName, ...rest] = student.name.trim().split(/\s+/);
  const res = await api<{ payment_links?: { web?: string }; message?: string; error_message?: string }>("/session", {
    method: "POST",
    customerId: payment.userId,
    body: JSON.stringify({
      order_id: orderId,
      amount: payment.amount.toFixed(2),
      customer_id: payment.userId,
      customer_email: student.email || undefined,
      customer_phone: student.mobileNumber || undefined,
      first_name: firstName,
      last_name: rest.join(" ") || undefined,
      payment_page_client_id: clientId(),
      action: "paymentPage",
      return_url: ctx.returnUrl,
      description: payment.items.length === 1 ? payment.items[0].label : `${payment.items.length} items`,
    }),
  });
  const url = res.body.payment_links?.web;
  if (res.status >= 300 || !url) throw new Error(`HDFC ${res.status}: ${res.body.error_message ?? res.body.message ?? "no payment link returned"}`);
  return url;
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

export const hdfcProvider: PaymentProvider = {
  id: "hdfc",
  label: "HDFC SmartGateway",
  testMode: false,
  isConfigured: () => Boolean(apiKey() && merchantId() && clientId()),

  async createCheckout(ctx) {
    const orderId = hdfcOrderIdFor(ctx.payment.id);
    return { providerOrderId: orderId, checkout: { type: "redirect", url: await createSession(ctx, orderId) } };
  },

  /** A pending payment's payment page link may have expired — ask HDFC for a fresh one for the SAME order. */
  async resumeCheckout(ctx) {
    const orderId = ctx.payment.providerOrderId ?? hdfcOrderIdFor(ctx.payment.id);
    return { type: "redirect", url: await createSession(ctx, orderId) };
  },

  /** The redirect flow has nothing to verify from the browser — ask the bank. */
  async verifyClientConfirmation(payment) {
    return this.fetchStatus(payment);
  },

  async fetchStatus(payment: PaymentRow): Promise<ProviderOutcome> {
    const orderId = payment.providerOrderId ?? hdfcOrderIdFor(payment.id);
    const res = await api<JuspayOrder>(`/orders/${encodeURIComponent(orderId)}`, { customerId: payment.userId });
    if (res.status === 404) return { state: "pending" }; // the parent never reached the payment page
    if (res.status >= 300) throw new Error(`HDFC ${res.status} while checking order ${orderId}`);
    return outcomeOf(res.body, payment);
  },

  verifyWebhook(rawBody, headers): WebhookEvent | null {
    if (!webhookUser() || !webhookPass()) return null;
    const expected = `Basic ${Buffer.from(`${webhookUser()}:${webhookPass()}`).toString("base64")}`;
    if (!safeEqual(headers.get("authorization") ?? "", expected)) return null;
    let body: { event_name?: string; content?: { order?: JuspayOrder } };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return null;
    }
    const order = body.content?.order;
    if (!order?.order_id) return { outcome: { state: "pending" } };
    // The body only says WHICH order to look at and whether it claims success; the service
    // re-reads the order from the status API before it settles anything.
    return {
      providerOrderId: order.order_id,
      outcome:
        order.status === "CHARGED"
          ? { state: "paid", providerPaymentId: order.txn_id || order.order_id, method: METHOD[String(order.payment_method_type ?? "").toUpperCase()] ?? "other" }
          : { state: "pending", reason: body.event_name === "ORDER_FAILED" ? (order.txn_detail?.error_message ?? "The payment attempt failed.") : undefined },
    };
  },
};
