import { randomInt } from "node:crypto";
import type { Payload } from "payload";
import { isUniqueViolation, relId } from "@/lib/server/request-actor";
import { recordEvent, type RecordEventInput } from "@/lib/server/record-events";
import { fingerprintOf, priceCart, type RequestedLine, CartError } from "./pricing";
import { getActiveProvider, getProviderById, getWebhookProviders } from "./providers";
import type { CheckoutInstructions, PaymentRow, PaymentStatus, ProviderOutcome } from "./types";

/**
 * Server-only. The payment life cycle, independent of which provider takes the
 * money. See supabase/migrations/…_payments.sql for the states.
 *
 * The rules this file exists to enforce:
 *  1. A payment row is written BEFORE any money moves, and a student can have only
 *     one in progress (a database unique index backs this up).
 *  2. The order + receipt are created only from a CONFIRMED payment — confirmed by the
 *     browser (verified), by the provider's webhook, or by a status check. Whichever
 *     arrives first wins; the others find it already done (idempotent).
 *  3. A pending payment is never cancelled or expired without first asking the provider
 *     whether money actually arrived — and if money arrives after a cancel/expiry, the
 *     order is still issued and the payment is flagged for staff to review.
 *  4. Prices always come from the database (pricing.ts), never from the browser.
 */

interface Queryable {
  query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>>; rowCount: number | null }>;
}
const pool = (payload: Payload) => (payload.db as unknown as { pool: Queryable }).pool;

type Doc = Record<string, unknown>;

export class PaymentError extends Error {
  constructor(
    message: string,
    public status = 400,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

// ---- settings --------------------------------------------------------------------

export interface PaymentSettings {
  /** 0 = the duplicate check is off. */
  duplicateWindowMinutes: number;
  pendingTimeoutMinutes: number;
}

export async function getPaymentSettings(payload: Payload, schoolId: string): Promise<PaymentSettings> {
  const school = (await payload.findByID({ collection: "schools", id: schoolId, depth: 0 }).catch(() => null)) as Doc | null;
  const dup = Number(school?.paymentDuplicateWindowMinutes);
  const timeout = Number(school?.paymentPendingTimeoutMinutes);
  return {
    duplicateWindowMinutes: Number.isFinite(dup) && dup >= 0 ? dup : 30,
    pendingTimeoutMinutes: Number.isFinite(timeout) && timeout >= 5 ? timeout : 30,
  };
}

// ---- mapping ---------------------------------------------------------------------

function toRow(doc: Doc): PaymentRow {
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  return {
    id: String(doc.id),
    schoolId: relId(doc.school),
    userId: relId(doc.user),
    status: doc.status as PaymentStatus,
    amount: Number(doc.amount),
    currency: String(doc.currency ?? "INR"),
    method: str(doc.method),
    provider: String(doc.provider),
    providerOrderId: str(doc.providerOrderId),
    providerPaymentId: str(doc.providerPaymentId),
    itemsFingerprint: String(doc.itemsFingerprint),
    items: ((doc.items as Array<Doc>) ?? []).map((item) => ({
      kind: item.kind as PaymentRow["items"][number]["kind"],
      refId: String(item.refId),
      label: String(item.label),
      meta: str(item.meta),
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
    })),
    expiresAt: str(doc.expiresAt),
    failureReason: str(doc.failureReason),
    completedAt: str(doc.completedAt),
    orderId: doc.order ? relId(doc.order) : undefined,
    lateSuccess: Boolean(doc.lateSuccess),
    newAdmissionSet: Boolean(doc.newAdmissionSet),
    extraRequestIds: Array.isArray(doc.extraRequestIds) ? (doc.extraRequestIds as unknown[]).map(String) : [],
    needsReview: Boolean(doc.needsReview),
    reviewNote: str(doc.reviewNote),
    createdAt: String(doc.createdAt),
  };
}

export async function loadPayment(payload: Payload, id: string): Promise<PaymentRow | null> {
  const doc = await payload.findByID({ collection: "payments", id, depth: 0 }).catch(() => null);
  return doc ? toRow(doc as unknown as Doc) : null;
}

async function getPendingPayment(payload: Payload, userId: string): Promise<PaymentRow | null> {
  const found = await payload.find({
    collection: "payments",
    where: { and: [{ user: { equals: userId } }, { status: { equals: "pending" } }] },
    limit: 1,
    depth: 0,
  });
  return found.docs[0] ? toRow(found.docs[0] as unknown as Doc) : null;
}

// ---- activity log ----------------------------------------------------------------

async function logPayment(
  payload: Payload,
  row: PaymentRow,
  eventType: string,
  summary: string,
  actor: RecordEventInput["actor"] = { type: "system", name: "System" },
  details: Record<string, unknown> = {},
  receiptCode?: string,
) {
  await recordEvent(payload, {
    eventType,
    entityType: "payment",
    entityId: row.id,
    schoolId: row.schoolId,
    studentId: row.userId,
    receiptCode,
    actor,
    summary,
    details: { amount: row.amount, provider: row.provider, ...details },
  });
}

const inr = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

// ---- order + receipt (only ever from a confirmed payment) --------------------------

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — read off a screen and typed at a counter

function generateReceiptCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

const KNOWN_METHODS = new Set(["upi", "card", "netbanking"]);

async function findOrderForPayment(payload: Payload, paymentId: string): Promise<Doc | null> {
  const found = await payload.find({ collection: "orders", where: { payment: { equals: paymentId } }, limit: 1, depth: 0 });
  return (found.docs[0] as unknown as Doc) ?? null;
}

/** Creates the order + receipt for a paid payment, once. Safe to call from several places at the same time. */
async function ensureOrder(payload: Payload, paymentId: string): Promise<{ orderId: string; receiptId: string; receiptCode: string }> {
  let row = (await loadPayment(payload, paymentId))!;
  let order = row.orderId ? ((await payload.findByID({ collection: "orders", id: row.orderId, depth: 0 }).catch(() => null)) as unknown as Doc | null) : null;
  if (!order) order = await findOrderForPayment(payload, paymentId);

  let createdNow = false;
  if (!order) {
    try {
      order = (await payload.create({
        collection: "orders",
        data: {
          user: row.userId,
          school: row.schoolId,
          payment: row.id,
          items: row.items.map((item) => ({
            kind: item.kind,
            refId: item.refId,
            label: item.label,
            meta: item.meta,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
          })),
          totalAmount: row.amount,
          newAdmissionSet: row.newAdmissionSet,
          paymentMethod: (KNOWN_METHODS.has(row.method ?? "") ? row.method : "other") as "upi" | "card" | "netbanking" | "other",
          status: "paid",
        },
        depth: 0,
      })) as unknown as Doc;
      createdNow = true;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Another request created it a moment ago — wait for it to be visible.
      for (let attempt = 0; attempt < 8 && !order; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        order = await findOrderForPayment(payload, paymentId);
      }
      if (!order) throw error;
    }
  }
  const orderId = String(order.id);

  if (createdNow && row.extraRequestIds.length > 0) {
    // The approved extra-item requests this payment was for are now used up.
    await pool(payload)
      .query(`UPDATE extra_item_requests SET status = 'used', used_payment_id = $2, updated_at = now() WHERE id = ANY($1::uuid[]) AND status = 'approved'`, [row.extraRequestIds, row.id])
      .catch((error) => console.error("[payments] could not mark extra-item requests used:", error));
  }
  if (createdNow) {
    // Program seats: take one per program line. Never below zero; the payment already succeeded so a race here must not fail it.
    for (const item of row.items) {
      if (item.kind !== "program") continue;
      await pool(payload)
        .query(`UPDATE programs SET seats_available = GREATEST(seats_available - 1, 0) WHERE id = $1 AND seats_available IS NOT NULL`, [item.refId])
        .catch((error) => console.error("[payments] could not update program seats:", error));
    }
  }
  if (!row.orderId) {
    await payload.update({ collection: "payments", id: row.id, data: { order: orderId }, depth: 0 });
    row = { ...row, orderId };
  }

  let receipt = ((await payload.find({ collection: "receipts", where: { order: { equals: orderId } }, limit: 1, depth: 0 })).docs[0] ?? null) as unknown as Doc | null;
  if (!receipt) {
    for (let attempt = 0; attempt < 5 && !receipt; attempt++) {
      const code = generateReceiptCode();
      const clash = await payload.count({ collection: "receipts", where: { qrPayload: { equals: code } } });
      if (clash.totalDocs > 0) continue;
      try {
        receipt = (await payload.create({
          collection: "receipts",
          data: { order: orderId, user: row.userId, school: row.schoolId, qrPayload: code, redemptionStatus: "ready", issuedAt: new Date().toISOString() },
          depth: 0,
        })) as unknown as Doc;
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        // The database refused a duplicate: either the code was taken a moment ago (try another) or another request already issued this order's receipt (use it).
        receipt = ((await payload.find({ collection: "receipts", where: { order: { equals: orderId } }, limit: 1, depth: 0 })).docs[0] ?? null) as unknown as Doc | null;
      }
    }
    if (!receipt) throw new PaymentError("Could not issue the receipt. Please contact the school — your payment is safe.", 500);
  }
  return { orderId, receiptId: String(receipt.id), receiptCode: String(receipt.qrPayload) };
}

/** Flags a paid payment for staff when it looks like the student may have paid twice for the same thing. */
async function flagForReviewIfNeeded(payload: Payload, row: PaymentRow, orderId: string, late: boolean, receiptCode: string) {
  const notes: string[] = [];
  if (late) notes.push("The money arrived AFTER this attempt had been cancelled or had expired.");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const others = await payload.find({
    collection: "orders",
    where: { and: [{ user: { equals: row.userId } }, { status: { equals: "paid" } }, { createdAt: { greater_than: since } }, { id: { not_equals: orderId } }] },
    limit: 20,
    depth: 0,
  });
  for (const other of others.docs as unknown as Doc[]) {
    if (fingerprintOf((other.items as Doc[]).map((i) => ({ kind: i.kind as never, refId: String(i.refId), meta: i.meta as string | undefined, quantity: Number(i.quantity) }))) === row.itemsFingerprint) {
      const receipt = await payload.find({ collection: "receipts", where: { order: { equals: String(other.id) } }, limit: 1, depth: 0 });
      notes.push(`Same items were already paid for (receipt ${receipt.docs[0] ? String((receipt.docs[0] as unknown as Doc).qrPayload) : "?"}) — this may be a double payment that needs a refund.`);
      break;
    }
  }
  if (notes.length === 0) return;
  await payload.update({ collection: "payments", id: row.id, data: { needsReview: true, reviewNote: notes.join(" ") }, depth: 0 });
  await logPayment(payload, row, "payment.flagged", `Payment ${receiptCode} needs a staff review: ${notes.join(" ")}`, undefined, { notes }, receiptCode);
}

// ---- state changes ---------------------------------------------------------------

/** The provider confirmed money was received. Idempotent; works from pending OR from a cancelled/expired/failed attempt. */
async function settlePaid(
  payload: Payload,
  row: PaymentRow,
  outcome: Extract<ProviderOutcome, { state: "paid" }>,
  source: string,
): Promise<PaymentRow> {
  const claimed = await pool(payload).query(
    `WITH prev AS (SELECT id, status FROM payments WHERE id = $1 FOR UPDATE)
     UPDATE payments p SET
       status = 'paid',
       provider_payment_id = $2,
       method = COALESCE($3, p.method),
       completed_at = COALESCE(p.completed_at, now()),
       failure_reason = NULL,
       late_success = p.late_success OR prev.status IN ('cancelled', 'expired', 'failed'),
       updated_at = now()
     FROM prev
     WHERE p.id = prev.id AND p.status <> 'paid'
     RETURNING prev.status AS prev_status`,
    [row.id, outcome.providerPaymentId, outcome.method ?? null],
  );
  const wasLate = claimed.rows[0] ? ["cancelled", "expired", "failed"].includes(String(claimed.rows[0].prev_status)) : false;

  // Even when someone else claimed it, make sure the order exists (a crash between the two steps is repaired here).
  const { orderId, receiptCode } = await ensureOrder(payload, row.id);
  const fresh = (await loadPayment(payload, row.id))!;
  if (claimed.rows[0]) {
    await logPayment(
      payload,
      fresh,
      "payment.paid",
      `Payment of ${inr(fresh.amount)} confirmed (${source})${wasLate ? " — after the attempt had ended" : ""}; receipt ${receiptCode}`,
      undefined,
      { source, providerPaymentId: outcome.providerPaymentId, late: wasLate },
      receiptCode,
    );
    await flagForReviewIfNeeded(payload, fresh, orderId, wasLate, receiptCode).catch((error) => console.error("[payments] review flag failed:", error));
  }
  return (await loadPayment(payload, row.id))!;
}

async function moveFromPending(payload: Payload, row: PaymentRow, status: "failed" | "cancelled" | "expired", reason: string | null): Promise<PaymentRow> {
  const result = await pool(payload).query(
    `UPDATE payments SET status = $2, failure_reason = COALESCE($3, failure_reason), completed_at = now(), updated_at = now() WHERE id = $1 AND status = 'pending'`,
    [row.id, status, reason],
  );
  const fresh = (await loadPayment(payload, row.id))!;
  if (result.rowCount) {
    const labels = { failed: "Payment failed", cancelled: "Payment cancelled", expired: "Payment timed out" } as const;
    await logPayment(payload, fresh, `payment.${status}`, `${labels[status]} (${inr(fresh.amount)})${reason ? `: ${reason}` : ""}`, undefined, { reason });
  }
  return fresh;
}

async function applyOutcome(payload: Payload, row: PaymentRow, outcome: ProviderOutcome, source: string): Promise<PaymentRow> {
  if (outcome.state === "paid") return settlePaid(payload, row, outcome, source);
  if (row.status !== "pending") return row;
  if (outcome.state === "failed") return moveFromPending(payload, row, "failed", outcome.reason);
  if (outcome.reason && outcome.reason !== row.failureReason) {
    await pool(payload).query(`UPDATE payments SET failure_reason = $2, updated_at = now() WHERE id = $1 AND status = 'pending'`, [row.id, outcome.reason]);
  }
  // Still pending at the provider. If it has run out of time, end it — we have JUST asked the provider and nothing was captured.
  if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
    return moveFromPending(payload, row, "expired", "Not completed in time");
  }
  return (await loadPayment(payload, row.id))!;
}

const LATE_CHECK_DAYS = 7;

/** Asks the provider where this payment stands and applies it. Never throws for a provider outage — it just leaves the payment as it was. */
export async function refreshPayment(payload: Payload, row: PaymentRow): Promise<PaymentRow> {
  if (row.status === "paid") {
    if (!row.orderId) await ensureOrder(payload, row.id).catch((error) => console.error("[payments] repair failed:", error));
    return (await loadPayment(payload, row.id)) ?? row;
  }
  const recent = Date.now() - new Date(row.createdAt).getTime() < LATE_CHECK_DAYS * 86_400_000;
  if (row.status !== "pending" && !recent) return row;
  const provider = getProviderById(row.provider);
  if (!provider || !provider.isConfigured()) return row;
  try {
    return await applyOutcome(payload, row, await provider.fetchStatus(row), "status check");
  } catch (error) {
    console.error(`[payments] could not check ${row.id} with ${row.provider}:`, error);
    return row;
  }
}

// ---- starting a payment ----------------------------------------------------------

export type StartResult =
  | { kind: "started" | "resumed"; payment: PaymentRow; checkout: CheckoutInstructions }
  | { kind: "pending-other"; payment: PaymentRow }
  | { kind: "duplicate"; amount: number; paidAt: string; receiptId?: string; receiptCode?: string };

/** `appUrl` is this site's own address — where the bank sends the parent back to after paying. */
export async function startPayment(payload: Payload, studentId: string, requested: RequestedLine[], appUrl: string): Promise<StartResult> {
  const provider = getActiveProvider();
  if (!provider.isConfigured()) throw new PaymentError("Online payments aren't available right now. Please contact the school.", 503);

  const student = (await payload.findByID({ collection: "users", id: studentId, depth: 0 })) as unknown as Doc;
  const schoolId = relId(student.school);
  const settings = await getPaymentSettings(payload, schoolId);
  const school = (await payload.findByID({ collection: "schools", id: schoolId, depth: 0 }).catch(() => null)) as Doc | null;

  // 1. Anything already in progress? Settle it first — it may have actually gone through.
  const existing = await getPendingPayment(payload, studentId);
  const current = existing ? await refreshPayment(payload, existing) : null;

  const fingerprint = fingerprintOf(
    (Array.isArray(requested) ? requested : []).map((line) => ({ kind: line?.kind, refId: String(line?.refId), meta: line?.meta, quantity: 1 })),
  );
  const ctxFor = (payment: PaymentRow) => ({
    payment,
    student: { name: String(student.name), email: (student.email as string | undefined) || undefined, mobileNumber: (student.mobileNumber as string | undefined) || undefined },
    schoolName: String(school?.name ?? "School"),
    timeoutSeconds: settings.pendingTimeoutMinutes * 60,
    returnUrl: `${appUrl.replace(/\/+$/, "")}/checkout/return?payment=${payment.id}`,
  });

  if (current && current.status === "pending") {
    // Same cart → carry on with the SAME payment (never a second one). Different cart → finish or cancel the first.
    if (current.itemsFingerprint === fingerprint) {
      const live = getProviderById(current.provider) ?? provider;
      try {
        return { kind: "resumed", payment: current, checkout: await live.resumeCheckout(ctxFor(current)) };
      } catch (error) {
        console.error("[payments] could not resume a payment with the provider:", error);
        throw new PaymentError("We couldn't reach the payment provider. Nothing new has been charged. Please try again in a moment.", 502);
      }
    }
    return { kind: "pending-other", payment: current };
  }

  // 2. The same items already paid for a moment ago? Stop — this is almost certainly the double payment.
  if (settings.duplicateWindowMinutes > 0) {
    const since = new Date(Date.now() - settings.duplicateWindowMinutes * 60_000).toISOString();
    const recentOrders = await payload.find({
      collection: "orders",
      where: { and: [{ user: { equals: studentId } }, { status: { equals: "paid" } }, { createdAt: { greater_than: since } }] },
      sort: "-createdAt",
      limit: 25,
      depth: 0,
    });
    for (const order of recentOrders.docs as unknown as Doc[]) {
      const orderFingerprint = fingerprintOf(
        (order.items as Doc[]).map((i) => ({ kind: i.kind as never, refId: String(i.refId), meta: i.meta as string | undefined, quantity: Number(i.quantity) })),
      );
      if (orderFingerprint !== fingerprint) continue;
      const receipt = (await payload.find({ collection: "receipts", where: { order: { equals: String(order.id) } }, limit: 1, depth: 0 })).docs[0] as unknown as Doc | undefined;
      return {
        kind: "duplicate",
        amount: Number(order.totalAmount),
        paidAt: String(order.createdAt),
        receiptId: receipt ? String(receipt.id) : undefined,
        receiptCode: receipt ? String(receipt.qrPayload) : undefined,
      };
    }
  }

  // 3. Price from the database and write the payment BEFORE any money moves.
  const { items, total, newAdmissionSet, extraRequestIds } = await priceCart(payload, studentId, requested);
  const expiresAt = new Date(Date.now() + settings.pendingTimeoutMinutes * 60_000).toISOString();
  let created: PaymentRow;
  try {
    created = toRow(
      (await payload.create({
        collection: "payments",
        data: { school: schoolId, user: studentId, status: "pending", amount: total, currency: "INR", provider: provider.id, itemsFingerprint: fingerprint, items, expiresAt, newAdmissionSet, extraRequestIds },
        depth: 0,
      })) as unknown as Doc,
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      const racing = await getPendingPayment(payload, studentId);
      if (racing) return { kind: "pending-other", payment: racing };
    }
    throw error;
  }

  // 4. Register with the provider.
  try {
    const { providerOrderId, checkout } = await provider.createCheckout(ctxFor(created));
    await pool(payload).query(`UPDATE payments SET provider_order_id = $2, updated_at = now() WHERE id = $1`, [created.id, providerOrderId]);
    created = { ...created, providerOrderId };
    await logPayment(payload, created, "payment.started", `Payment of ${inr(total)} started (${items.map((i) => i.label).join(", ")})`, { type: "student", id: studentId, name: String(student.name) }, { items: items.map((i) => i.label) });
    return { kind: "started", payment: created, checkout };
  } catch (error) {
    console.error("[payments] provider could not start a payment:", error);
    await moveFromPending(payload, created, "failed", "The payment provider could not be reached");
    throw new PaymentError("We couldn't reach the payment provider. Nothing has been charged. Please try again in a moment.", 502);
  }
}

// ---- the browser reports back ---------------------------------------------------

export async function confirmFromBrowser(payload: Payload, studentId: string, paymentId: string, body: Record<string, unknown>): Promise<PaymentRow> {
  const row = await loadPayment(payload, paymentId);
  if (!row || row.userId !== studentId) throw new PaymentError("Payment not found.", 404);
  if (row.status === "paid") return refreshPayment(payload, row);
  const provider = getProviderById(row.provider);
  if (!provider) throw new PaymentError("Unknown payment provider.", 400);
  const outcome = await provider.verifyClientConfirmation(row, body).catch((error) => {
    console.error("[payments] could not verify a confirmation:", error);
    return undefined;
  });
  if (outcome === null) throw new PaymentError("We couldn't verify that payment. If money was deducted it will be confirmed automatically — check My payments in a minute.", 400);
  if (outcome === undefined) return row; // provider unreachable — status check / webhook will settle it
  return applyOutcome(payload, row, outcome, "confirmed by the payment screen");
}

export async function cancelPayment(payload: Payload, studentId: string, paymentId: string): Promise<PaymentRow> {
  const row = await loadPayment(payload, paymentId);
  if (!row || row.userId !== studentId) throw new PaymentError("Payment not found.", 404);
  if (row.status !== "pending") return row;
  const provider = getProviderById(row.provider);
  if (!provider || !provider.isConfigured()) throw new PaymentError("The payment provider isn't available right now. Please try again shortly.", 503);
  // Never cancel blind: if money already arrived, this becomes a paid order instead.
  let outcome: ProviderOutcome;
  try {
    outcome = await provider.fetchStatus(row);
  } catch (error) {
    console.error("[payments] cancel: could not check with the provider:", error);
    throw new PaymentError("We couldn't confirm with the payment provider whether this payment went through, so it hasn't been cancelled. Please try again in a minute.", 503);
  }
  if (outcome.state === "paid") return settlePaid(payload, row, outcome, "found while cancelling");
  return moveFromPending(payload, row, "cancelled", null);
}

// ---- webhook ----------------------------------------------------------------------

export async function handleWebhook(payload: Payload, rawBody: string, headers: Headers): Promise<"ok" | "invalid"> {
  let provider = null as ReturnType<typeof getWebhookProviders>[number] | null;
  let event = null as ReturnType<ReturnType<typeof getWebhookProviders>[number]["verifyWebhook"]>;
  for (const candidate of getWebhookProviders()) {
    event = candidate.verifyWebhook(rawBody, headers);
    if (event) {
      provider = candidate;
      break;
    }
  }
  if (!provider || !event) return "invalid";

  let row: PaymentRow | null = null;
  if (event.paymentId) row = await loadPayment(payload, event.paymentId);
  if (!row && event.providerOrderId) {
    const found = await payload.find({
      collection: "payments",
      where: { and: [{ provider: { equals: provider.id } }, { providerOrderId: { equals: event.providerOrderId } }] },
      limit: 1,
      depth: 0,
    });
    row = found.docs[0] ? toRow(found.docs[0] as unknown as Doc) : null;
  }
  if (!row) return "ok"; // not one of ours (or not recorded yet) — acknowledge so the provider stops retrying
  // A webhook only tells us WHERE to look. Before any money is trusted, re-read the payment from the provider.
  let outcome = event.outcome;
  if (outcome.state === "paid") outcome = await provider.fetchStatus(row); // throws → 500 → the provider retries later
  await applyOutcome(payload, row, outcome, "provider webhook");
  return "ok";
}

// ---- what the browser sees --------------------------------------------------------

export interface PaymentView {
  id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  method?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  failureReason?: string;
  lateSuccess: boolean;
  items: Array<{ label: string; meta?: string; unitPrice: number; quantity: number; kind: string }>;
  receipt?: { id: string; code: string };
  needsReview?: boolean;
  reviewNote?: string;
}

async function receiptsByOrder(payload: Payload, orderIds: string[]): Promise<Map<string, { id: string; code: string }>> {
  const map = new Map<string, { id: string; code: string }>();
  if (orderIds.length === 0) return map;
  const found = await payload.find({ collection: "receipts", where: { order: { in: orderIds } }, limit: orderIds.length + 5, depth: 0 });
  for (const receipt of found.docs as unknown as Doc[]) map.set(relId(receipt.order), { id: String(receipt.id), code: String(receipt.qrPayload) });
  return map;
}

export async function toViews(payload: Payload, rows: PaymentRow[], forStaff = false): Promise<PaymentView[]> {
  const receipts = await receiptsByOrder(payload, rows.map((r) => r.orderId).filter((id): id is string => Boolean(id)));
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    method: row.method,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    expiresAt: row.expiresAt,
    failureReason: row.failureReason,
    lateSuccess: row.lateSuccess,
    items: row.items.map((item) => ({ label: item.label, meta: item.meta, unitPrice: item.unitPrice, quantity: item.quantity, kind: item.kind })),
    receipt: row.orderId ? receipts.get(row.orderId) : undefined,
    ...(forStaff ? { needsReview: row.needsReview, reviewNote: row.reviewNote } : {}),
  }));
}

/** A student's own payments, newest first; the one in progress (if any) is checked with the provider first. */
export async function listStudentPayments(payload: Payload, studentId: string): Promise<PaymentView[]> {
  const pending = await getPendingPayment(payload, studentId);
  if (pending) await refreshPayment(payload, pending);
  const found = await payload.find({ collection: "payments", where: { user: { equals: studentId } }, sort: "-createdAt", limit: 50, depth: 0 });
  return toViews(payload, (found.docs as unknown as Doc[]).map(toRow));
}

export { CartError };
