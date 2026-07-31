import type { CollectionConfig } from "payload";
import { authenticated } from "../access/authenticated";

/**
 * Mirrors src/types/user-profile.ts UserProfile — parent/student profile
 * records. Deliberately NOT a Payload `auth` collection: Phase 3's mock OTP
 * login (client-side session in src/store/auth-store.tsx) stays as-is; see
 * .claude/DECISIONS.md "Phase 9 auth-model decision" for the full reasoning.
 * This collection just stores the profile data that flow reads/writes.
 */
export const Users: CollectionConfig = {
  slug: "users",
  admin: { useAsTitle: "name" },
  access: { read: () => true, create: () => true, update: authenticated, delete: authenticated },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "mobileNumber", type: "text", required: true, unique: true },
    {
      name: "role",
      type: "select",
      required: true,
      options: [
        { label: "Parent", value: "parent" },
        { label: "Student", value: "student" },
      ],
    },
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    { name: "classLevel", type: "relationship", relationTo: "class-levels", required: true },
    {
      name: "preferredLanguage",
      type: "select",
      required: true,
      options: [
        { label: "English", value: "en" },
        { label: "Hindi", value: "hi" },
        { label: "Telugu", value: "te" },
      ],
    },
  ],
};
