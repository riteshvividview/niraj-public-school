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
    // What is inside the set. No prices here — only the set itself is priced.
    // Copied onto each order (orders.items.parts) so staff can tick items off.
    {
      name: "contents",
      type: "array",
      fields: [
        { name: "section", type: "select", required: true, options: ["textbook", "notebook", "stationery"] },
        { name: "subject", type: "text" },
        { name: "name", type: "text", required: true },
        { name: "publisher", type: "text" },
        { name: "detail", type: "text" },
        { name: "quantity", type: "number", required: true, defaultValue: 1 },
        { name: "starred", type: "checkbox", defaultValue: false },
      ],
    },
    // Optional variant fields — unset means "applies to every student in
    // this class". Some grades' book fee varies by academic language and/or
    // stream/elective (see the school's real price sheet); grades without
    // that variation just leave these unset on their one book row per class.
    {
      name: "language",
      type: "select",
      options: [
        { label: "Hindi", value: "hindi" },
        { label: "Telugu", value: "telugu" },
      ],
    },
    {
      name: "stream",
      type: "select",
      options: [
        { label: "Science", value: "science" },
        { label: "Economics", value: "economics" },
      ],
    },
    {
      name: "elective",
      type: "select",
      options: [
        { label: "ENA", value: "ena" },
        { label: "Robotics & AI", value: "roboticsAI" },
        { label: "Home Science", value: "homeScience" },
      ],
    },
  ],
};
