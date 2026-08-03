import type { CollectionConfig } from "payload";
import { authenticated } from "../access/authenticated";

/**
 * Backs upload fields elsewhere (currently just Users.avatar). Files go to
 * Vercel Blob in any environment where BLOB_READ_WRITE_TOKEN is set (see
 * payload.config.ts's `plugins` — @payloadcms/storage-vercel-blob), since
 * Vercel's serverless filesystem is ephemeral and can't be written to
 * persistently. `staticDir` below is only ever used as the local-disk
 * fallback for local dev when that token isn't set.
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
