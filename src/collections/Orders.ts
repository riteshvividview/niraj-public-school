import { APIError, type CollectionAfterChangeHook, type CollectionBeforeChangeHook, type CollectionConfig } from "payload";
import { denyAll, readOwnOrStaff, staffOnly } from "../access/request-access";
import { actorFromUser, recordEvent } from "@/lib/server/record-events";
import { collectedEmail, type EmailBookSet } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/brevo";
import { assignedBookSetOf, bookMatchesAssignedSet } from "@/lib/book-set";
import { deriveRedemptionStatus, isLineCollected } from "@/lib/order-items";
import type { OrderItem } from "@/types";

interface OrderPartRow {
  id: string;
  section: "textbook" | "notebook" | "stationery";
  subject?: string | null;
  name: string;
  publisher?: string | null;
  detail?: string | null;
  quantity: number;
  starred?: boolean | null;
  collectedAt?: string | null;
}

interface OrderItemRow {
  id: string;
  kind: string;
  refId: string;
  label: string;
  meta?: string | null;
  unitPrice: number;
  quantity: number;
  collectedAt?: string | null;
  parts?: OrderPartRow[] | null;
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
    parts: (row.parts ?? []).map((part) => ({
      id: part.id,
      section: part.section,
      subject: part.subject ?? undefined,
      name: part.name,
      publisher: part.publisher ?? undefined,
      detail: part.detail ?? undefined,
      quantity: part.quantity,
      starred: Boolean(part.starred),
      collectedAt: part.collectedAt ?? null,
    })),
  };
}

const toEmailPart = (part: OrderPartRow) => ({
  name: part.name,
  subject: part.subject,
  detail: part.detail,
  quantity: part.quantity,
  starred: Boolean(part.starred),
});

/** Parts of a line handed over by this save (collectedAt unset -> set). */
function newlyCollectedParts(item: OrderItemRow, before: Map<string, string | null>): OrderPartRow[] {
  return (item.parts ?? []).filter((part) => part.collectedAt && !before.get(part.id));
}

function partStateBefore(prevItems: OrderItemRow[]): Map<string, string | null> {
  const map = new Map<string, string | null>();
  prevItems.forEach((item) => (item.parts ?? []).forEach((part) => map.set(part.id, part.collectedAt ?? null)));
  return map;
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
  const prevParts = partStateBefore(prevItems);

  const lineChanged = items.filter((item) => (item.collectedAt ?? null) !== prevCollectedAt.get(item.id));
  const partsChanged = items.filter((item) =>
    (item.parts ?? []).some((part) => (part.collectedAt ?? null) !== (prevParts.get(part.id) ?? null)),
  );
  if (lineChanged.length === 0 && partsChanged.length === 0) return doc;

  // Lines with no per-item breakdown (uniform, or a book set without contents).
  const justCollected = lineChanged.filter((item) => item.collectedAt && (item.parts ?? []).length === 0);
  const justCollectedSets = items.filter((item) => (item.parts ?? []).length > 0 && newlyCollectedParts(item, prevParts).length > 0);

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

  if (justCollected.length === 0 && justCollectedSets.length === 0) return doc;

  const userId = typeof doc.user === "string" ? doc.user : doc.user?.id;
  const user = userId ? await req.payload.findByID({ collection: "users", id: userId }) : null;
  if (user?.email) {
    const stillPending = orderItems.filter((item) => !item.collectedAt && (item.parts ?? []).length === 0);
    // Every book set that still has something to hand over, plus the ones touched now.
    const bookSets: EmailBookSet[] = items
      .filter((item) => (item.parts ?? []).length > 0 && (justCollectedSets.includes(item) || !isLineCollected(toOrderItem(item))))
      .map((item) => ({
        title: item.label,
        meta: item.meta,
        collected: (item.parts ?? []).filter((part) => part.collectedAt).map(toEmailPart),
        pending: (item.parts ?? []).filter((part) => !part.collectedAt).map(toEmailPart),
      }));
    await sendTransactionalEmail({
      to: user.email,
      toName: user.name,
      subject: status === "collected" ? "All items collected" : "Items collected",
      html: collectedEmail({
        receiptCode: receiptDoc.qrPayload,
        justCollectedItems: justCollected.map(toOrderItem),
        stillPendingItems: stillPending,
        bookSets,
      }),
    });
  }

  return doc;
};

/**
 * Book sets carry a per-item list (orders.items.parts). Server-side, always:
 *   - on create, the list is copied from the book set's contents — whatever
 *     the client sent is ignored, so it can't be forged or left out;
 *   - on update, a set's own collected stamp follows its items: collected only
 *     once every item is (stamped when the last one is handed over).
 */
const syncBookParts: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  const lines = data.items as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(lines)) return data;

  if (operation === "create") {
    for (const line of lines) {
      line.parts = undefined;
      if (line.kind !== "book" || typeof line.refId !== "string") continue;
      const book = await req.payload.findByID({ collection: "books", id: line.refId, depth: 0 }).catch(() => null);
      const contents = (book as { contents?: Array<Record<string, unknown>> } | null)?.contents ?? [];
      line.parts = contents.map((c) => ({
        section: c.section,
        subject: c.subject ?? undefined,
        name: c.name,
        publisher: c.publisher ?? undefined,
        detail: c.detail ?? undefined,
        quantity: c.quantity ?? 1,
        starred: Boolean(c.starred),
      }));
    }
    return data;
  }

  // update — only staff reach this (access), and they send the full items array.
  const previous = new Map(((originalDoc?.items ?? []) as OrderItemRow[]).map((item) => [item.id, item]));
  const now = new Date().toISOString();
  for (const line of lines) {
    const parts = (line.parts as OrderPartRow[] | undefined) ?? [];
    if (parts.length === 0) continue;
    const prevLine = typeof line.id === "string" ? previous.get(line.id) : undefined;
    const allDone = parts.every((part) => part.collectedAt);
    line.collectedAt = allDone ? (prevLine?.collectedAt ?? now) : null;
  }
  return data;
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
  const prevParts = partStateBefore((previousDoc.items ?? []) as OrderItemRow[]);
  const rows = items as unknown as OrderItemRow[];
  // Book sets: log what was handed over / taken back item by item, one entry per set per save.
  const setChanges = rows
    .map((row) => {
      const parts = row.parts ?? [];
      return {
        row,
        collected: parts.filter((part) => part.collectedAt && !prevParts.get(part.id)),
        undone: parts.filter((part) => !part.collectedAt && prevParts.get(part.id)),
        total: parts.length,
        doneNow: parts.filter((part) => part.collectedAt).length,
      };
    })
    .filter((entry) => entry.collected.length > 0 || entry.undone.length > 0);
  // Lines with a breakdown are logged through their items above, not as a whole.
  const changed = items.filter(
    (i) => (i.collectedAt ?? null) !== (before.get(i.id) ?? null) && !(rows.find((r) => r.id === i.id)?.parts ?? []).length,
  );
  if (changed.length === 0 && setChanges.length === 0) return doc;

  const receipt = await req.payload.find({ collection: "receipts", where: { order: { equals: doc.id } }, limit: 1, depth: 0 });
  const receiptCode = receipt.docs[0]?.qrPayload as string | undefined;
  for (const entry of setChanges) {
    const names = (list: OrderPartRow[]) => list.map((part) => part.name).join("; ");
    for (const [list, collected] of [
      [entry.collected, true],
      [entry.undone, false],
    ] as const) {
      if (list.length === 0) continue;
      await recordEvent(req.payload, {
        eventType: collected ? "item.collected" : "item.uncollected",
        entityType: "order",
        entityId: String(doc.id),
        schoolId,
        studentId,
        receiptCode,
        actor: actorFromUser(req.user),
        summary: `${collected ? "Collected" : "Collection undone"} ${list.length} of ${entry.total} in ${entry.row.label}: ${names(list)} (${entry.doneNow}/${entry.total} collected now)`.slice(0, 480),
        details: {
          orderItemId: entry.row.id,
          label: entry.row.label,
          collectedNow: entry.doneNow,
          total: entry.total,
          parts: list.map((part) => ({ id: part.id, name: part.name, quantity: part.quantity })),
        },
      });
    }
  }
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
  access: { read: readOwnOrStaff, create: denyAll, update: staffOnly, delete: denyAll },
  hooks: { beforeChange: [enforceStudentOrderRules, syncBookParts], afterChange: [logOrderHistory, notifyOnCollection] },
  fields: [
    { name: "user", type: "relationship", relationTo: "users", required: true },
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    // The confirmed payment this order came from (see collections/Payments.ts).
    { name: "payment", type: "relationship", relationTo: "payments" },
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
        // Book sets only: what is inside the set, copied from the set's
        // contents when the order is placed (see syncBookParts). Each item is
        // handed over — or not — on its own; the set counts as collected
        // once every item is.
        {
          name: "parts",
          type: "array",
          fields: [
            { name: "section", type: "select", required: true, options: ["textbook", "notebook", "stationery"] },
            { name: "subject", type: "text" },
            { name: "name", type: "text", required: true },
            { name: "publisher", type: "text" },
            { name: "detail", type: "text" },
            { name: "quantity", type: "number", required: true, defaultValue: 1 },
            { name: "starred", type: "checkbox", defaultValue: false },
            { name: "collectedAt", type: "date" },
          ],
        },
      ],
    },
    { name: "totalAmount", type: "number", required: true },
    {
      name: "paymentMethod",
      type: "select",
      required: true,
      options: ["upi", "card", "netbanking", "other"],
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
