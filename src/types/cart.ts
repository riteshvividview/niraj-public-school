export type CartItemKind = "book" | "uniform" | "stationery" | "program";

/**
 * A single cart line. Not a Payload collection itself — this is client-side
 * state (see src/store) that becomes an Order's `items` snapshot at checkout.
 */
export interface CartItem {
  /** Cart line id (stable per selection, not the same as refId). */
  id: string;
  kind: CartItemKind;
  /** Id of the underlying Book / UniformItem / StationeryItem / Program. */
  refId: string;
  label: string;
  /** Optional context, e.g. a chosen uniform size or a book's subject. */
  meta?: string;
  unitPrice: number;
  quantity: number;
}
