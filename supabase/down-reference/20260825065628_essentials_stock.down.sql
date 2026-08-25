-- Reference only — see the up migration's own note on why this was
-- hand-written, not attempted via the generate-migration route.

ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "essentials_stock_id";
DROP TABLE "essentials_stock" CASCADE;
DROP TYPE "public"."enum_essentials_stock_kind";
