import { APIError, type CollectionAfterChangeHook, type CollectionBeforeChangeHook, type CollectionConfig } from "payload";
import { authenticated } from "../access/authenticated";
import { denyAll, readOwnOrStaff, staffOnly } from "../access/request-access";
import { actorFromUser, recordEvent } from "@/lib/server/record-events";
import { collectedEmail } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/brevo";
import { assignedBookSetOf, bookMatchesAssignedSet } from "@/lib/book-set";
import { deriveRedemptionStatus } from "@/lib/order-items";
import type { OrderItem } from "@/types";

interface OrderItemRow {
  id: string;
  kind: string;
  refId: string;
  label: string;
  meta?: string | null;
  unitPrice: number;
  quantity: number;
  collectedAt?: string | null;
}

function toOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    kind: row.kind as OrderItem["kind"],
    refId: row.refId,
    label: row.label,
    meta: row.meta ?? undefined,
    unitPrice: row.unitPrice,
    quantity: row.quantity,
    collectedAt: row.collectedAt ?? null,
  };
}

/**
 * Fires when staff mark item(s) collected at the counter (see
 * markOrderItemsCollected in src/lib/data-source/orders.ts). Diffs
 * previousDoc vs doc by row id to find items whose collectedAt just
 * transitioned unset -> set (an undo, set -> unset, is a staff correction —
 * no email, but the rollup status still needs to reflect it), rolls the
 * current state up into the linked Receipt's redemptionStatus, and emails
 * the student just the newly-collected items (plus what's still pending)
 * — not the whole receipt again. Program check-in ("checked-in") is a
 * separate, whole-receipt-only path (markReceiptRedeemed) and untouched by
 * this hook.
 */
const notifyOnCollection: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (operation !== "update" || !previousDoc) return doc;

  const items: OrderItemRow[] = doc.items ?? [];
  const prevItems: OrderItemRow[] = previousDoc.items ?? [];
  const prevCollectedAt = new Map(prevItems.map((item) => [item.id, item.collectedAt ?? null]));
  const changed = items.filter((item) => (item.collectedAt ?? null) !== prevCollectedAt.get(item.id));
  if (changed.length === 0) return doc;
  const justCollected = changed.filter((item) => item.collectedAt);

  const orderItems = items.map(toOrderItem);
  const status = deriveRedemptionStatus(orderItems);

  const receiptsResult = await req.payload.find({
    collection: "receipts",
    where: { order: { equals: doc.id } },
    limit: 1,
  });
  const receiptDoc = receiptsResult.docs[0];
  if (!receiptDoc || receiptDoc.redemptionStatus === "checked-in") return doc;

  await req.payload.update({
    collection: "receipts",
    id: receiptDoc.id,
    data: { redemptionStatus: status, redeemedAt: status === "ready" ? null : (receiptDoc.redeemedAt ?? new Date().toISOString()) },
  });

  if (justCollected.length === 0) return doc;

  const userId = typeof doc.user === "string" ? doc.user : doc.user?.id;
  const user = userId ? await req.payload.findByID({ collection: "users", id: userId }) : null;
  if (user?.email) {
    const stillPending = orderItems.filter((item) => !item.collectedAt);
    await sendTransactionalEmail({
      to: user.email,
      toName: user.name,
      subject: status === "collected" ? "All items collected" : "Items collected",
      html: collectedEmail({
        receiptCode: receiptDoc.qrPayload,
        justCollectedItems: justCollected.map(toOrderItem),
        stillPendingItems: stillPending,
      }),
    });
  }

  return doc;
};

/**
 * Server-side half of the book-set lock (Essentials → Books greys out the
 * options a student isn't assigned, but a disabled button is not a guard).
 * When a student account creates an order:
 *   • it must be for themselves (the collection only demands *a* session), and
 *   • every book line must belong to the book set the school assigned them —
 *     second language / stream / elective. An attribute the school hasn't
 *     recorded yet isn't enforced (that field stays selectable in the UI).
 * Staff/Local-API creates (seed, console) are not restricted.
 */
const enforceStudentOrderRules: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== "create") return data;
  const actor = req.user;
  if (!actor || actor.collection !== "users") return data;

  const ownerId = typeof data.user === "object" && data.user ? (data.user as { id: string }).id : (data.user as string | undefined);
  if (ownerId !== actor.id) throw new APIError("You can only place orders for your own account.", 403, undefined, true);

  const bookLines = ((data.items ?? []) as Array<{ kind?: string; refId?: string }>).filter((line) => line.kind === "book");
  if (bookLines.length === 0) return data;

  const student = await req.payload.findByID({ collection: "users", id: actor.id, depth: 0 });
  const assigned = assignedBookSetOf({
    academicLanguage: student.academicLanguage ?? undefined,
    languageLevel: student.languageLevel ?? undefined,
    stream: student.stream ?? undefined,
    elective: student.elective ?? undefined,
  });
  for (const line of bookLines) {
    const book = line.refId ? await req.payload.findByID({ collection: "books", id: line.refId, depth: 0 }).catch(() => null) : null;
    if (!book) throw new APIError("A book in your cart is no longer available. Please review your cart.", 400, undefined, true);
    if (!bookMatchesAssignedSet(book as { language?: string | null; stream?: string | null; elective?: string | null }, assigned)) {
      throw new APIError(
        "Your cart has books that don't match the book set assigned to you. Please reopen Essentials → Books and review your cart.",
        400,
        undefined,
        true,
      );
    }
  }
  return data;
};

/**
 * Writes the order's history to the permanent activity log: the order being
 * placed, and every item being collected at the counter (or that being undone)
 * with who did it. See src/lib/server/record-events.ts.
 */
const logOrderHistory: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  const studentId = typeof doc.user === "string" ? doc.user : doc.user?.id;
  const schoolId = typeof doc.school === "string" ? doc.school : doc.school?.id;
  if (!studentId || !schoolId) return doc;

  const items: Array<{ id: string; label: string; meta?: string | null; quantity: number; collectedAt?: string | null }> = doc.items ?? [];

  if (operation === "create") {
    await recordEvent(req.payload, {
      eventType: "order.created",
      entityType: "order",
      entityId: String(doc.id),
      schoolId,
      studentId,
      actor: actorFromUser(req.user),
      summary: `Order placed — ${items.length} item(s), ₹${Number(doc.totalAmount)} via ${String(doc.paymentMethod).toUpperCase()}`,
      details: { totalAmount: doc.totalAmount, paymentMethod: doc.paymentMethod, status: doc.status, items: items.map((i) => ({ label: i.label, meta: i.meta, quantity: i.quantity })) },
    });
    return doc;
  }

  if (operation !== "update" || !previousDoc) return doc;
  const before = new Map(
    ((previousDoc.items ?? []) as Array<{ id: string; collectedAt?: string | null }>).map((i) => [i.id, i.collectedAt ?? null]),
  );
  const changed = items.filter((i) => (i.collectedAt ?? null) !== (before.get(i.id) ?? null));
  if (changed.length === 0) return doc;

  const receipt = await req.payload.find({ collection: "receipts", where: { order: { equals: doc.id } }, limit: 1, depth: 0 });
  const receiptCode = receipt.docs[0]?.qrPayload as string | undefined;
  for (const item of changed) {
    const collected = Boolean(item.collectedAt);
    await recordEvent(req.payload, {
      eventType: collected ? "item.collected" : "item.uncollected",
      entityType: "order",
      entityId: String(doc.id),
      schoolId,
      studentId,
      receiptCode,
      actor: actorFromUser(req.user),
      summary: `${collected ? "Collected" : "Collection undone"}: ${item.label}${item.meta ? ` (${item.meta})` : ""} ×${item.quantity}`,
      details: { orderItemId: item.id, label: item.label, meta: item.meta, quantity: item.quantity, collectedAt: item.collectedAt ?? null },
    });
  }
  return doc;
};

/** Mirrors src/types/order.ts Order. Real write path for checkout — see src/lib/data-source/orders.ts. */
export const Orders: CollectionConfig = {
  slug: "orders",
  // Paid orders are permanent records. A student can read only their own and
  // create one for themselves (enforced in enforceStudentOrderRules); only
  // school staff can update (marking items collected at the counter); nobody
  // can delete over REST, and the database refuses deletes too (see the
  // record_history migration).
  access: { read: readOwnOrStaff, create: authenticated, update: staffOnly, delete: denyAll },
  hooks: { beforeChange: [enforceStudentOrderRules], afterChange: [logOrderHistory, notifyOnCollection] },
  fields: [
    { name: "user", type: "relationship", relationTo: "users", required: true },
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    {
      name: "items",
      type: "array",
      required: true,
      minRows: 1,
      fields: [
        { name: "kind", type: "select", required: true, options: ["book", "uniform", "program"] },
        { name: "refId", type: "text", required: true },
        { name: "label", type: "text", required: true },
        { name: "meta", type: "text" },
        { name: "unitPrice", type: "number", required: true },
        { name: "quantity", type: "number", required: true },
        // Set per-item at the counter (see markOrderItemsCollected) —
        // unset means "not yet collected". Program items never use this;
        // program attendance stays a whole-receipt "checked-in" mark.
        { name: "collectedAt", type: "date" },
      ],
    },
    { name: "totalAmount", type: "number", required: true },
    {
      name: "paymentMethod",
      type: "select",
      required: true,
      options: ["upi", "card", "netbanking"],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "paid",
      options: ["paid", "pending", "failed", "refunded"],
    },
  ],
};
