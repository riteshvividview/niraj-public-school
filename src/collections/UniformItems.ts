import type { CollectionConfig } from "payload";
import { staffOnly } from "../access/request-access";

/** Mirrors src/types/uniform-item.ts UniformItem. */
export const UniformItems: CollectionConfig = {
  slug: "uniform-items",
  admin: { useAsTitle: "name" },
  // Anyone can read the catalogue (the parent app and login page need it); only school staff (a real
  // payload-admins session) can create, change or delete it.
  access: { read: () => true, create: staffOnly, update: staffOnly, delete: staffOnly },
  fields: [
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    // Every class-list item belongs to one class. A "new admission item" is common to
    // all classes (optionally limited to a range of classes) and has no class of its own.
    {
      name: "classLevel",
      type: "relationship",
      relationTo: "class-levels",
      validate: (value: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
        value || siblingData?.newAdmission ? true : "Choose a class for this item.",
    },
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
    // New-admission items (hoody, belt, girls' cycling shorts…): REQUIRED for new students as
    // part of their full set, optional for existing students. Not tied to a class — the range
    // below limits them (empty = every class). Compared on the class sort order (class-levels.order).
    { name: "newAdmission", type: "checkbox", defaultValue: false },
    { name: "newAdmissionFromOrder", type: "number" },
    { name: "newAdmissionToOrder", type: "number" },
    // Taken out of the lists but kept, because past orders / exchanges still point at it.
    { name: "retired", type: "checkbox", defaultValue: false },
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
