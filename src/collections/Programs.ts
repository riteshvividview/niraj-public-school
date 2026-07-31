import type { CollectionConfig } from "payload";

/** Mirrors src/types/program.ts Program. */
export const Programs: CollectionConfig = {
  slug: "programs",
  admin: { useAsTitle: "title" },
  // Fully open — see Books.ts's comment; the Program Manager writes here
  // over unauthenticated REST.
  access: { read: () => true, create: () => true, update: () => true, delete: () => true },
  fields: [
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    { name: "title", type: "text", required: true },
    {
      name: "category",
      type: "select",
      required: true,
      options: [
        { label: "Workshop", value: "workshop" },
        { label: "Sports", value: "sports" },
        { label: "Camp", value: "camp" },
        { label: "Annual Day", value: "annual-day" },
        { label: "Exhibition", value: "exhibition" },
        { label: "Extra Class", value: "extra-class" },
      ],
    },
    { name: "description", type: "textarea", required: true },
    { name: "venue", type: "text", required: true },
    { name: "date", type: "date", required: true },
    { name: "fee", type: "number", required: true },
    { name: "seatsTotal", type: "number", required: true },
    { name: "seatsAvailable", type: "number", required: true },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "open",
      options: [
        { label: "Open", value: "open" },
        { label: "Filling Fast", value: "filling-fast" },
        { label: "Full", value: "full" },
        { label: "Closed", value: "closed" },
      ],
    },
    { name: "contactPhone", type: "text", required: true },
    { name: "imageUrl", type: "text" },
  ],
};
