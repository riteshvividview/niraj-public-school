import type { CollectionConfig } from "payload";
import { staffOnly } from "../access/request-access";

/**
 * Mirrors src/types/school.ts ClassLevel. Kept as its own collection (not
 * embedded) to match Phase 1's relational model.
 * Fully open: the School Console (Students tab's "Add new class" flow, plus
 * Catalogue/Program managers reading this list) writes here over
 * unauthenticated REST — none of the app's three auth systems produce a
 * real Payload session yet. See Books.ts for the same pattern.
 */
export const ClassLevels: CollectionConfig = {
  slug: "class-levels",
  admin: { useAsTitle: "label" },
  access: { read: () => true, create: staffOnly, update: staffOnly, delete: staffOnly },
  fields: [
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    { name: "label", type: "text", required: true },
    { name: "board", type: "text", required: true },
    { name: "order", type: "number", required: true },
  ],
};
