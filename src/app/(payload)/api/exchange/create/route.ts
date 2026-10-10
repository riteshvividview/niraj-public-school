import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-url";
import { exchangeRequestedEmail } from "@/lib/email/request-templates";
import {
  ACTIVE_EXCHANGE_STATUSES,
  EXCHANGE_NOTE_MAX,
  EXCHANGE_REASONS,
  exchangePriceDifference,
  getExchangeEligibility,
  type ExchangeReasonValue,
} from "@/lib/exchange-rules";
import { eventActor, recordRequestEvent } from "@/lib/server/record-events";
import { getStaffRecipients, sendEmailsSafely } from "@/lib/server/request-notify";
import { getRequestActor, isUniqueViolation, jsonError, relId } from "@/lib/server/request-actor";
import type { OrderItem } from "@/types";

const REASON_LABELS: Record<ExchangeReasonValue, string> = {
  "size-too-small": "Size is too small",
  "size-too-large": "Size is too large",
  defect: "Defect / damaged",
  other: "Other",
};

/**
 * A student/parent asks to exchange one collected uniform line for another
 * size. Everything is re-validated here — the Exchange tab's own eligibility
 * messaging is a convenience, not a guard.
 */
export async function POST(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind !== "student") return jsonError("Please log in as a student to request an exchange.", 401);
  const { payload, user } = actor;

  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const orderItemId = typeof body?.orderItemId === "string" ? body.orderItemId : "";
  const toSize = typeof body?.toSize === "string" ? body.toSize.trim() : "";
  const reason = body?.reason as ExchangeReasonValue;
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  const quantityInput = body?.quantity === undefined ? 1 : Number(body.quantity);

  if (!orderId || !orderItemId || !toSize) return jsonError("Choose the item and the new size.", 400);
  if (!EXCHANGE_REASONS.includes(reason)) return jsonError("Choose a reason for the exchange.", 400);
  if (note.length > EXCHANGE_NOTE_MAX) return jsonError(`Keep the note under ${EXCHANGE_NOTE_MAX} characters.`, 400);
  if (!Number.isInteger(quantityInput) || quantityInput < 1) return jsonError("Quantity must be a whole number of at least 1.", 400);

  const order = await payload.findByID({ collection: "orders", id: orderId, depth: 0 }).catch(() => null);
  // Same message for "not found" and "someone else's" — don't confirm other families' order ids exist.
  if (!order || relId(order.user) !== user.id) return jsonError("We couldn't find that order.", 404);

  const rawItems = (order.items ?? []) as Array<Record<string, unknown>>;
  const line = rawItems.find((item) => item.id === orderItemId);
  if (!line) return jsonError("We couldn't find that item on the order.", 404);
  const item: OrderItem = {
    id: String(line.id),
    kind: line.kind as OrderItem["kind"],
    refId: String(line.refId),
    label: String(line.label),
    meta: (line.meta as string | null) ?? undefined,
    unitPrice: Number(line.unitPrice),
    quantity: Number(line.quantity),
    collectedAt: (line.collectedAt as string | null) ?? null,
  };

  const history = await payload.find({
    collection: "exchange-requests",
    where: {
      and: [
        { order: { equals: orderId } },
        { orderItemId: { equals: orderItemId } },
        { status: { in: [...ACTIVE_EXCHANGE_STATUSES, "completed"] } },
      ],
    },
    limit: 10,
    depth: 0,
  });
  const eligibility = getExchangeEligibility(
    item,
    { status: order.status as "paid" },
    new Set(history.docs.some((d) => d.status === "pending" || d.status === "approved") ? [orderItemId] : []),
    new Set(history.docs.some((d) => d.status === "completed") ? [orderItemId] : []),
  );
  if (!eligibility.eligible) {
    const messages = {
      "not-uniform": "Only uniform items can be exchanged.",
      "not-paid": "This order isn't paid.",
      "not-collected": "You can request an exchange after collecting the item at the school counter.",
      "window-closed": "The exchange period for this item has ended.",
      "already-requested": "There is already an open exchange request for this item.",
      "already-exchanged": "This item has already been exchanged. Please visit the school office for anything further.",
      "no-sizes": "No other sizes are available for this item.",
    } as const;
    return jsonError(messages[eligibility.reason], eligibility.reason === "already-requested" ? 409 : 422, {
      reason: eligibility.reason,
    });
  }
  if (quantityInput > item.quantity) return jsonError("You can't exchange more than you bought.", 422);

  const uniform = await payload.findByID({ collection: "uniform-items", id: item.refId, depth: 0 }).catch(() => null);
  const sizeOptions = ((uniform?.sizeOptions ?? []) as Array<{ size: string; price: number }>);
  const target = sizeOptions.find((option) => option.size === toSize);
  if (!uniform || !target) return jsonError("That size isn't available for this item.", 422);
  const fromSize = item.meta ?? "";
  if (!fromSize || fromSize === toSize) return jsonError("Choose a different size from the one you have.", 422);

  const receipts = await payload.find({
    collection: "receipts",
    where: { order: { equals: orderId } },
    limit: 1,
    depth: 0,
  });
  const receipt = receipts.docs[0];
  if (!receipt) return jsonError("We couldn't find the receipt for this order.", 404);

  const priceDifference = exchangePriceDifference(item.unitPrice, target.price, quantityInput);

  let created;
  try {
    created = await payload.create({
      collection: "exchange-requests",
      data: {
        school: relId(order.school),
        user: user.id,
        order: orderId,
        receipt: receipt.id,
        orderItemId,
        uniformItemId: item.refId,
        itemLabel: item.label,
        fromSize,
        toSize,
        quantity: quantityInput,
        fromUnitPrice: item.unitPrice,
        toUnitPrice: target.price,
        priceDifference,
        reason,
        note: note || undefined,
        status: "pending",
      },
      depth: 0,
    });
  } catch (error) {
    // The partial unique index (one open request per order line) is the real guard against a double-tap.
    if (isUniqueViolation(error)) {
      return jsonError("There is already an open exchange request for this item.", 409, { reason: "already-requested" });
    }
    console.error("[exchange/create] failed:", error);
    return jsonError("We couldn't save your request. Please try again.", 500);
  }

  await recordRequestEvent(payload, created as unknown as Record<string, unknown>, {
    eventType: "exchange.requested",
    entityType: "exchange",
    receiptCode: String(receipt.qrPayload),
    actor: eventActor(actor),
    summary: `Exchange requested: ${item.label} ${fromSize} → ${toSize} (qty ${quantityInput}) — ${REASON_LABELS[reason]}`,
    details: { fromSize, toSize, quantity: quantityInput, priceDifference, reason, note: note || null },
  });

  // --- notify staff (never blocks or fails the request) ---------------------
  try {
    const classLevel = await payload
      .findByID({ collection: "class-levels", id: relId(user.classLevel), depth: 0 })
      .catch(() => null);
    const recipients = await getStaffRecipients(payload, relId(order.school));
    await sendEmailsSafely(
      recipients,
      `New uniform exchange request — ${user.name ?? "student"}`,
      exchangeRequestedEmail({
        student: {
          name: String(user.name ?? ""),
          registerNumber: String(user.username ?? ""),
          className: classLevel?.label as string | undefined,
          section: user.section as string | undefined,
          mobileNumber: user.mobileNumber as string | undefined,
        },
        receiptCode: String(receipt.qrPayload),
        itemLabel: item.label,
        fromSize,
        toSize,
        quantity: quantityInput,
        reasonLabel: REASON_LABELS[reason],
        note: note || undefined,
        priceDifference,
        consoleUrl: `${getAppUrl(request)}/console/exchange-requests`,
      }),
    );
  } catch (error) {
    console.error("[exchange/create] notification failed:", error);
  }

  return NextResponse.json({ ok: true, id: created.id });
}

