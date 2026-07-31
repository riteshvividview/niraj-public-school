import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";

import { Books } from "./src/collections/Books";
import { ClassLevels } from "./src/collections/ClassLevels";
import { Orders } from "./src/collections/Orders";
import { PayloadAdmins } from "./src/collections/PayloadAdmins";
import { Programs } from "./src/collections/Programs";
import { Receipts } from "./src/collections/Receipts";
import { Schools } from "./src/collections/Schools";
import { StationeryItems } from "./src/collections/StationeryItems";
import { UniformItems } from "./src/collections/UniformItems";
import { Users } from "./src/collections/Users";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  // The Payload admin UI's own operator login — see PayloadAdmins.ts for why
  // this is separate from the app's parent and console staff auth.
  admin: {
    user: PayloadAdmins.slug,
  },
  collections: [
    PayloadAdmins,
    Schools,
    ClassLevels,
    Books,
    UniformItems,
    StationeryItems,
    Programs,
    Users,
    Orders,
    Receipts,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    // UUID ids, not the adapter's default integer/serial — keeps every
    // document id a string, matching src/types/*'s `id: string` everywhere
    // (and relationship fields, which store the related doc's id) without
    // needing String(id) coercion throughout the data-source layer.
    idType: "uuid",
    pool: {
      connectionString: process.env.DATABASE_URI ?? "",
    },
  }),
});
