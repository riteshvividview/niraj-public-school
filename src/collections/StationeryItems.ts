import type { CollectionConfig } from "payload";

/** Mirrors src/types/stationery-item.ts StationeryItem. */
export const StationeryItems: CollectionConfig = {
  slug: "stationery-items",
  admin: { useAsTitle: "name" },
  // Fully open — see Books.ts's comment; the Catalogue Manager writes here
  // over unauthenticated REST.
  access: { read: () => true, create: () => true, update: () => true, delete: () => true },
  fields: [
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    { name: "classLevel", type: "relationship", relationTo: "class-levels", required: true },
    { name: "name", type: "text", required: true },
    { name: "quantityLabel", type: "text", required: true },
    { name: "price", type: "number", required: true },
    { name: "imageUrl", type: "text" },
  ],
};
