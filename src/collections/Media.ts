import type { CollectionConfig } from "payload";
import { authenticated } from "../access/authenticated";

/**
 * Backs upload fields elsewhere (currently just Users.avatar). Local disk
 * storage (staticDir) — fine for now, but won't survive a redeploy on an
 * ephemeral host (Vercel etc.); swap to Supabase Storage/S3 via a
 * @payloadcms/storage-* adapter before a real production deploy.
 */
export const Media: CollectionConfig = {
  slug: "media",
  admin: { useAsTitle: "filename" },
  access: { read: () => true, create: authenticated, update: authenticated, delete: authenticated },
  upload: {
    staticDir: "media",
    imageSizes: [{ name: "avatar", width: 256, height: 256, position: "centre" }],
    mimeTypes: ["image/*"],
  },
  fields: [],
};
