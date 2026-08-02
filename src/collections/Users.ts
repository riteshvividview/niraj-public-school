import type { CollectionConfig } from "payload";

/**
 * Mirrors src/types/user-profile.ts UserProfile — student/parent portal
 * accounts. No self-registration: only the school console (staff/teachers)
 * or /admin creates these records (manually or via bulk import) — see
 * .claude/DECISIONS.md's "No self-registration, register-number login"
 * entry. Access is fully open (`() => true` on every operation) for the
 * same reason every other console-writable collection is: the console's
 * staff session is still a mock (Phase 8), not a real Payload session, so
 * its REST calls (create/edit/reset-password/delete a student from the
 * Students manager) carry no auth cookie. This is a known, deliberate,
 * temporary gap — see DECISIONS.md — and a more sensitive instance of it
 * than most, since it also covers password resets; tighten the moment
 * console auth becomes real.
 *
 * Login uses Payload's built-in `loginWithUsername` (email login fully
 * disabled) — the `username` field IS the school's register number; the
 * app's own UI labels it "Register Number" everywhere but the underlying
 * Payload field/endpoint is the standard `username`/`/login` mechanism, not
 * a custom one.
 */
export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    loginWithUsername: {
      allowEmailLogin: false,
      requireEmail: false,
      requireUsername: true,
    },
    tokenExpiration: 60 * 60 * 24 * 7, // 7 days — a student shouldn't need to re-login often
  },
  admin: { useAsTitle: "name" },
  access: { read: () => true, create: () => true, update: () => true, delete: () => true },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "avatar", type: "upload", relationTo: "media" },
    { name: "mobileNumber", type: "text" },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "student",
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
      defaultValue: "en",
      options: [
        { label: "English", value: "en" },
        { label: "Hindi", value: "hi" },
        { label: "Telugu", value: "te" },
      ],
    },
  ],
};
