import type { CollectionConfig } from "payload";
import { authenticated } from "../access/authenticated";

/**
 * Mirrors src/types/user-profile.ts UserProfile — parent/student profile
 * records. A real Payload `auth` collection (email/password) — see
 * .claude/DECISIONS.md's "Real email/password auth" entry for why this
 * replaced Phase 3's mock OTP flow. `create` stays public so parents can
 * self-register; Payload injects `email`/`password`/hashing fields
 * automatically because of `auth: true`.
 */
export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7, // 7 days — a parent shouldn't need to re-login often
  },
  admin: { useAsTitle: "email" },
  access: { read: () => true, create: () => true, update: authenticated, delete: authenticated },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "avatar", type: "upload", relationTo: "media" },
    { name: "mobileNumber", type: "text" },
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
