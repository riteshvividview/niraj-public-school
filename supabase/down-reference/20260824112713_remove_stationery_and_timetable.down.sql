-- Reference only — recreates the dropped schema empty (no data to restore,
-- since both tables were verified empty before the up-migration ran).

CREATE TYPE "public"."enum_orders_items_kind__old" AS ENUM('book', 'uniform', 'stationery', 'program');
ALTER TABLE "orders_items" ALTER COLUMN "kind" TYPE "public"."enum_orders_items_kind__old" USING "kind"::text::"public"."enum_orders_items_kind__old";
DROP TYPE "public"."enum_orders_items_kind";
ALTER TYPE "public"."enum_orders_items_kind__old" RENAME TO "enum_orders_items_kind";

ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "timetables_id" uuid;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "stationery_items_id" uuid;

CREATE TABLE "timetables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"class_level_id" uuid NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "timetables_periods" (
	"_order" integer NOT NULL,
	"_parent_id" uuid NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"label" varchar NOT NULL,
	"monday" varchar,
	"tuesday" varchar,
	"wednesday" varchar,
	"thursday" varchar,
	"friday" varchar,
	"saturday" varchar
);
CREATE TABLE "timetables_notes" (
	"_order" integer NOT NULL,
	"_parent_id" uuid NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"heading" varchar NOT NULL,
	"body" varchar
);
CREATE TABLE "stationery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"class_level_id" uuid NOT NULL,
	"name" varchar NOT NULL,
	"quantity_label" varchar NOT NULL,
	"price" numeric NOT NULL,
	"image_url" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "timetables_periods" ADD CONSTRAINT "timetables_periods_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."timetables"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "timetables_notes" ADD CONSTRAINT "timetables_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."timetables"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_class_level_id_class_levels_id_fk" FOREIGN KEY ("class_level_id") REFERENCES "public"."class_levels"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "stationery_items" ADD CONSTRAINT "stationery_items_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "stationery_items" ADD CONSTRAINT "stationery_items_class_level_id_class_levels_id_fk" FOREIGN KEY ("class_level_id") REFERENCES "public"."class_levels"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_timetables_fk" FOREIGN KEY ("timetables_id") REFERENCES "public"."timetables"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stationery_items_fk" FOREIGN KEY ("stationery_items_id") REFERENCES "public"."stationery_items"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "timetables_periods_order_idx" ON "timetables_periods" USING btree ("_order");
CREATE INDEX "timetables_periods_parent_id_idx" ON "timetables_periods" USING btree ("_parent_id");
CREATE INDEX "timetables_notes_order_idx" ON "timetables_notes" USING btree ("_order");
CREATE INDEX "timetables_notes_parent_id_idx" ON "timetables_notes" USING btree ("_parent_id");
CREATE INDEX "timetables_school_idx" ON "timetables" USING btree ("school_id");
CREATE INDEX "timetables_class_level_idx" ON "timetables" USING btree ("class_level_id");
CREATE INDEX "timetables_updated_at_idx" ON "timetables" USING btree ("updated_at");
CREATE INDEX "timetables_created_at_idx" ON "timetables" USING btree ("created_at");
CREATE INDEX "payload_locked_documents_rels_timetables_id_idx" ON "payload_locked_documents_rels" USING btree ("timetables_id");
CREATE INDEX "stationery_items_school_idx" ON "stationery_items" USING btree ("school_id");
CREATE INDEX "stationery_items_class_level_idx" ON "stationery_items" USING btree ("class_level_id");
CREATE INDEX "stationery_items_updated_at_idx" ON "stationery_items" USING btree ("updated_at");
CREATE INDEX "stationery_items_created_at_idx" ON "stationery_items" USING btree ("created_at");
CREATE INDEX "payload_locked_documents_rels_stationery_items_id_idx" ON "payload_locked_documents_rels" USING btree ("stationery_items_id");
