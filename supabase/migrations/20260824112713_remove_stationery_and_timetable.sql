-- Remove Stationery and Timetable, no longer offered by the school.
-- Verified zero rows in stationery_items, timetables, and orders_items
-- (kind = 'stationery') before writing this migration — no data loss.

-- --- Stationery ------------------------------------------------------------
ALTER TABLE "stationery_items" DISABLE ROW LEVEL SECURITY;
DROP TABLE "stationery_items" CASCADE;
ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "stationery_items_id";

-- --- Timetable ---------------------------------------------------------
ALTER TABLE "timetables_periods" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "timetables_notes" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "timetables" DISABLE ROW LEVEL SECURITY;
DROP TABLE "timetables_periods" CASCADE;
DROP TABLE "timetables_notes" CASCADE;
DROP TABLE "timetables" CASCADE;
ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "timetables_id";

-- --- Narrow orders_items.kind: drop the "stationery" enum value ------------
-- Postgres has no ALTER TYPE ... DROP VALUE, so recreate the enum without it.
CREATE TYPE "public"."enum_orders_items_kind__new" AS ENUM('book', 'uniform', 'program');
ALTER TABLE "orders_items" ALTER COLUMN "kind" TYPE "public"."enum_orders_items_kind__new" USING "kind"::text::"public"."enum_orders_items_kind__new";
DROP TYPE "public"."enum_orders_items_kind";
ALTER TYPE "public"."enum_orders_items_kind__new" RENAME TO "enum_orders_items_kind";
