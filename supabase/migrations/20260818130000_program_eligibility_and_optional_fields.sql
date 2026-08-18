CREATE TABLE "programs_rels" (
	"id" serial PRIMARY KEY NOT NULL,
	"order" integer,
	"parent_id" uuid NOT NULL,
	"path" varchar NOT NULL,
	"class_levels_id" uuid
);

ALTER TABLE "programs" ALTER COLUMN "category" SET DATA TYPE varchar;
ALTER TABLE "programs" ALTER COLUMN "venue" DROP NOT NULL;
ALTER TABLE "programs" ALTER COLUMN "seats_total" DROP NOT NULL;
ALTER TABLE "programs" ALTER COLUMN "seats_available" DROP NOT NULL;
ALTER TABLE "programs_rels" ADD CONSTRAINT "programs_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "programs_rels" ADD CONSTRAINT "programs_rels_class_levels_fk" FOREIGN KEY ("class_levels_id") REFERENCES "public"."class_levels"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "programs_rels_order_idx" ON "programs_rels" USING btree ("order");
CREATE INDEX "programs_rels_parent_idx" ON "programs_rels" USING btree ("parent_id");
CREATE INDEX "programs_rels_path_idx" ON "programs_rels" USING btree ("path");
CREATE INDEX "programs_rels_class_levels_id_idx" ON "programs_rels" USING btree ("class_levels_id");
DROP TYPE "public"."enum_programs_category";
