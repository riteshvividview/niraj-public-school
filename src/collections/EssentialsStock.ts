import type { CollectionConfig } from "payload";
import { staffOnly } from "../access/request-access";

/**
 * Staff-only inventory tracking for Books/UniformItems — never read by the
 * student app. One row per (school, kind, refId, variantKey): a book's
 * variantKey is always "" (its language/stream/elective variants are already
 * separate Book rows), a uniform item's variantKey is its size string
 * (matches sizeOptions[].size and an order line's `meta` — see
 * src/lib/cart-items.ts's uniformToCartItem). Decremented automatically when
 * a Receipt is issued — see Receipts.ts's notifyReadyToCollect.
 *
 * The (school, kind, refId, variantKey) uniqueness is enforced by a compound
 * SQL index (Payload field-level `unique` can't express multi-column) — see
 * supabase/migrations for the essentials_stock migration.
 */
export const EssentialsStock: CollectionConfig = {
  slug: "essentials-stock",
  admin: { useAsTitle: "refId" },
  // Staff only — students never read stock; the console and the payment routes (Local API) are the only users.
  access: { read: staffOnly, create: staffOnly, update: staffOnly, delete: staffOnly },
  fields: [
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    { name: "kind", type: "select", required: true, options: ["book", "uniform"] },
    { name: "refId", type: "text", required: true },
    // "" for books; a uniform item's size string for uniform. Not `required`
    // — Payload's required-field validation treats "" as missing, but "" is
    // exactly the valid value for a book row (defaultValue covers the DB's
    // own NOT NULL; the app always sends this field explicitly either way).
    { name: "variantKey", type: "text", defaultValue: "" },
    // Deliberately allowed to go negative (so no CHECK >= 0 in the database) — payment has already happened by the time stock is taken, and the payment routes subtract in one atomic SQL statement. Allowed to go negative — a negative count is the honest signal that
    // physical stock is behind what's been sold, not something to hide.
    { name: "quantityOnHand", type: "number", required: true, defaultValue: 0 },
    { name: "lowStockThreshold", type: "number", required: true, defaultValue: 5 },
    { name: "notes", type: "text" },
  ],
};
