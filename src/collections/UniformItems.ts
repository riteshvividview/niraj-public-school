import type { CollectionConfig } from "payload";

/** Mirrors src/types/uniform-item.ts UniformItem. */
export const UniformItems: CollectionConfig = {
  slug: "uniform-items",
  admin: { useAsTitle: "name" },
  // Fully open — see Books.ts's comment; the Catalogue Manager writes here
  // over unauthenticated REST.
  access: { read: () => true, create: () => true, update: () => true, delete: () => true },
  fields: [
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    { name: "classLevel", type: "relationship", relationTo: "class-levels", required: true },
    { name: "name", type: "text", required: true },
    {
      name: "category",
      type: "select",
      required: true,
      options: [
        { label: "Uniform", value: "uniform" },
        { label: "Kit", value: "kit" },
      ],
    },
    { name: "description", type: "text" },
    { name: "imageUrl", type: "text" },
    // Unset = unisex item. Set when a school's real uniform bundle differs
    // by gender (see getUniformItemsByClass — unset matches every student
    // until their profile records a gender).
    {
      name: "gender",
      type: "select",
      options: [
        { label: "Male", value: "male" },
        { label: "Female", value: "female" },
      ],
    },
    {
      name: "sizeOptions",
      type: "array",
      required: true,
      minRows: 1,
      fields: [
        { name: "size", type: "text", required: true },
        { name: "price", type: "number", required: true },
      ],
    },
  ],
};
