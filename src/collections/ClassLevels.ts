import type { CollectionConfig } from "payload";
import { authenticated } from "../access/authenticated";

/** Mirrors src/types/school.ts ClassLevel. Kept as its own collection (not embedded) to match Phase 1's relational model. */
export const ClassLevels: CollectionConfig = {
  slug: "class-levels",
  admin: { useAsTitle: "label" },
  access: { read: () => true, create: authenticated, update: authenticated, delete: authenticated },
  fields: [
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    { name: "label", type: "text", required: true },
    { name: "board", type: "text", required: true },
    { name: "order", type: "number", required: true },
  ],
};
