import type { CollectionConfig } from "payload";
import { staffOnly } from "../access/request-access";

/** Mirrors src/types/program.ts Program. */
export const Programs: CollectionConfig = {
  slug: "programs",
  admin: { useAsTitle: "title" },
  // Anyone can read the catalogue (the parent app and login page need it); only school staff (a real
  // payload-admins session) can create, change or delete it.
  access: { read: () => true, create: staffOnly, update: staffOnly, delete: staffOnly },
  fields: [
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    { name: "title", type: "text", required: true },
    // Free text, not a fixed select — staff can type any category rather
    // than being limited to a preset list. The console form still suggests
    // common ones via a <datalist>.
    { name: "category", type: "text", required: true },
    { name: "description", type: "textarea", required: true },
    { name: "venue", type: "text" },
    { name: "date", type: "date", required: true },
    { name: "fee", type: "number", required: true },
    { name: "seatsTotal", type: "number" },
    { name: "seatsAvailable", type: "number" },
    // Unset/empty = open to every grade, not "no grades" — the console form
    // never lets staff produce a program nobody can see.
    { name: "eligibleClassLevels", type: "relationship", relationTo: "class-levels", hasMany: true },
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
