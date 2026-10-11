import type { CartItem, Order, OrderStatus, PaymentMethod } from "@/types";
import { fromOrderParts, toOrderParts, type PayloadOrderPart } from "./order-parts-mapper";
import { payloadFind, payloadFindById, payloadUpdate } from "./payload-rest";

interface PayloadOrderItem {
  /** Real Payload `orders_items` row id — the stable per-item key, unlike a synthesized one. */
  id: string;
  kind: CartItem["kind"];
  refId: string;
  label: string;
  meta?: string | null;
  unitPrice: number;
  quantity: number;
  collectedAt?: string | null;
  parts?: PayloadOrderPart[] | null;
}

interface PayloadOrderDoc {
  id: string;
  user: string;
  school: string;
  items: PayloadOrderItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

function toOrder(doc: PayloadOrderDoc): Order {
  return {
    id: doc.id,
    userId: doc.user,
    schoolId: doc.school,
    items: doc.items.map((item) => ({
      id: item.id,
      kind: item.kind,
      refId: item.refId,
      label: item.label,
      meta: item.meta ?? undefined,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      collectedAt: item.collectedAt ?? null,
      parts: toOrderParts(item.parts),
    })),
    totalAmount: doc.totalAmount,
    paymentMethod: doc.paymentMethod,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** Console — Reports Dashboard. */
export async function getOrdersBySchool(schoolId: string): Promise<Order[]> {
  const docs = await payloadFind<PayloadOrderDoc>("orders", { school: schoolId });
  return docs.map(toOrder);
}

/**
 * Parent — "which programs is this student already registered for," without
 * the full `receipts` + `depth:1` order fetch `getReceiptsByUser` requires.
 * Queries `orders` directly and trims to just `items` (`select[items]`) —
 * items are an embedded array field, not a relation, so no `depth` is
 * needed to see them.
 */
export async function getRegisteredProgramIds(userId: string): Promise<Set<string>> {
  const docs = await payloadFind<Pick<PayloadOrderDoc, "items">>(
    "orders",
    { user: userId },
    { "select[items]": "true" },
  );
  const ids = new Set<string>();
  docs.forEach((doc) => {
    doc.items.forEach((item) => {
      if (item.kind === "program") ids.add(item.refId);
    });
  });
  return ids;
}

export async function getOrderById(id: string): Promise<Order | null> {
  const doc = await payloadFindById<PayloadOrderDoc>("orders", id);
  return doc ? toOrder(doc) : null;
}

/**
 * Console — Receipt / QR Scanner's "Save changes" button. `changes` maps
 * item id -> desired collected state (true = mark collected, false = undo
 * a mistaken mark). A key may also be the id of one item inside a book set
 * (an order line's `parts`); a line key on a book set applies to every item
 * in it, and the server then derives the set's own collected state — the Scanner batches every toggle a staff member makes
 * locally and calls this once, rather than one REST call per click. Sends
 * the full items array back (Payload array-field PATCH semantics upsert by
 * row `id`), so untouched rows pass through unchanged. The Orders
 * `afterChange` hook (see collections/Orders.ts) picks up the diff and
 * handles the rollup Receipt status + "items collected" email (undo makes
 * no email — there's nothing to notify the parent about).
 */
export async function updateOrderItemsCollected(
  orderId: string,
  changes: Record<string, boolean>,
): Promise<Order> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error("Order not found.");
  const now = new Date().toISOString();
  const items = order.items.map((item) => {
    const hasParts = (item.parts?.length ?? 0) > 0;
    if (!hasParts) return item.id in changes ? { ...item, collectedAt: changes[item.id] ? now : null } : item;
    const parts = (item.parts ?? []).map((part) => {
      const want = part.id in changes ? changes[part.id] : item.id in changes ? changes[item.id] : undefined;
      if (want === undefined) return part;
      // Already in the wanted state: keep its original timestamp.
      if (want === Boolean(part.collectedAt)) return part;
      return { ...part, collectedAt: want ? now : null };
    });
    return { ...item, parts };
  });
  const doc = await payloadUpdate<PayloadOrderDoc>("orders", orderId, {
    items: items.map((item) => ({
      id: item.id,
      kind: item.kind,
      refId: item.refId,
      label: item.label,
      meta: item.meta,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      collectedAt: item.collectedAt,
      parts: fromOrderParts(item.parts),
    })),
  });
  return toOrder(doc);
}
