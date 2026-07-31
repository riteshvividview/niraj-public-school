import type { CollectionConfig } from "payload";

/** Mirrors src/types/book.ts Book. */
export const Books: CollectionConfig = {
  slug: "books",
  admin: { useAsTitle: "title" },
  // Fully open: the School Console's Catalogue Manager (see
  // .claude/DECISIONS.md "Phase 9 access control") writes here over
  // unauthenticated REST — none of the app's three auth systems produce a
  // real Payload session yet.
  access: { read: () => true, create: () => true, update: () => true, delete: () => true },
  fields: [
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    { name: "classLevel", type: "relationship", relationTo: "class-levels", required: true },
    { name: "title", type: "text", required: true },
    { name: "subject", type: "text", required: true },
    { name: "author", type: "text" },
    { name: "price", type: "number", required: true },
    { name: "coverImageUrl", type: "text" },
  ],
};
