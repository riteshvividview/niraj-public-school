-- Adds the "essentials-stock" collection — staff-only inventory tracking for
-- Books/UniformItems (never read by the student app). One row per
-- (school, kind, refId, variantKey); decremented automatically when a
-- Receipt is issued — see src/collections/Receipts.ts's notifyReadyToCollect.
--
-- Written by hand rather than via the generate-migration route: drizzle-kit's
-- schema diff against the last snapshot (which still lists the now-removed
-- stationery_items/timetables* tables — see the 2026-08-24 removal migration,
-- itself also hand-written for the same reason) prompts interactively asking
-- whether essentials_stock is a new table or a rename of one of those, which
-- hangs forever with no stdin to answer it. Same precedent as that migration
-- and the OTP one — SQL hand-written to match Payload's own conventions,
-- confirmed against books/uniform_items' generated SQL in the init migration.

CREATE TYPE "public"."enum_essentials_stock_kind" AS ENUM('book', 'uniform');

CREATE TABLE "essentials_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"kind" "public"."enum_essentials_stock_kind" NOT NULL,
	"ref_id" varchar NOT NULL,
	"variant_key" varchar DEFAULT '' NOT NULL,
	"quantity_on_hand" numeric DEFAULT 0 NOT NULL,
	"low_stock_threshold" numeric DEFAULT 5 NOT NULL,
	"notes" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "essentials_stock" ADD CONSTRAINT "essentials_stock_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX "essentials_stock_school_idx" ON "essentials_stock" USING btree ("school_id");
CREATE INDEX "essentials_stock_updated_at_idx" ON "essentials_stock" USING btree ("updated_at");
CREATE INDEX "essentials_stock_created_at_idx" ON "essentials_stock" USING btree ("created_at");
-- Compound uniqueness (Payload field-level `unique` can't express this) —
-- what makes find-or-create-by-key in src/lib/data-source/essentials-stock.ts
-- safe from race duplicates.
CREATE UNIQUE INDEX "essentials_stock_school_kind_ref_variant_idx" ON "essentials_stock" USING btree ("school_id", "kind", "ref_id", "variant_key");

-- --- payload_locked_documents_rels: register the new collection ------------
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "essentials_stock_id" uuid;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_essentials_stock_fk" FOREIGN KEY ("essentials_stock_id") REFERENCES "public"."essentials_stock"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "payload_locked_documents_rels_essentials_stock_id_idx" ON "payload_locked_documents_rels" USING btree ("essentials_stock_id");
