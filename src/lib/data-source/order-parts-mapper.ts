import type { OrderItemPart } from "@/types";

/** The `parts` array on a Payload `orders` item — what is inside a purchased book set. */
export interface PayloadOrderPart {
  id: string;
  section: OrderItemPart["section"];
  subject?: string | null;
  name: string;
  publisher?: string | null;
  detail?: string | null;
  quantity: number;
  starred?: boolean | null;
  collectedAt?: string | null;
}

export function toOrderParts(parts: PayloadOrderPart[] | null | undefined): OrderItemPart[] {
  return (parts ?? []).map((part) => ({
    id: part.id,
    section: part.section,
    subject: part.subject ?? undefined,
    name: part.name,
    publisher: part.publisher ?? undefined,
    detail: part.detail ?? undefined,
    quantity: part.quantity,
    starred: Boolean(part.starred),
    collectedAt: part.collectedAt ?? null,
  }));
}

/** Back to the shape Payload accepts on a PATCH (rows are matched by `id`). */
export function fromOrderParts(parts: OrderItemPart[] | undefined) {
  return (parts ?? []).map((part) => ({
    id: part.id,
    section: part.section,
    subject: part.subject,
    name: part.name,
    publisher: part.publisher,
    detail: part.detail,
    quantity: part.quantity,
    starred: part.starred,
    collectedAt: part.collectedAt,
  }));
}
