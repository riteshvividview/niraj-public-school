-- New-admission uniform set.
--
-- A student is "new" when the two digits at the start of their register number
-- (26NPS0123 → 26) are the current academic year's (or later); staff can override
-- that per student. New students must buy the school's full uniform set — the class's
-- regular items PLUS the "new admission items" (hoody, belt, girls' cycling shorts) —
-- once; later extras need a staff-approved request. Existing students are unchanged.
--
-- Nothing is deleted: the hoody / belt / cycling-shorts rows that were added to the
-- Class 2 and Class 8 lists are RETIRED (hidden from the lists) because past orders
-- and exchanges still point at them.

-- ---- uniform_items: new-admission items are not tied to one class --------------------
ALTER TABLE "uniform_items" ALTER COLUMN "class_level_id" DROP NOT NULL;
ALTER TABLE "uniform_items"
	ADD COLUMN "new_admission" boolean DEFAULT false,
	ADD COLUMN "new_admission_from_order" numeric,
	ADD COLUMN "new_admission_to_order" numeric,
	ADD COLUMN "retired" boolean DEFAULT false;
ALTER TABLE "uniform_items" ADD CONSTRAINT "uniform_items_scope_check" CHECK ("class_level_id" IS NOT NULL OR "new_admission" = true);
ALTER TABLE "uniform_items" ADD CONSTRAINT "uniform_items_class_range_check" CHECK (
	"new_admission_from_order" IS NULL OR "new_admission_to_order" IS NULL OR "new_admission_from_order" <= "new_admission_to_order"
);
CREATE INDEX "uniform_items_new_admission_idx" ON "uniform_items" USING btree ("school_id") WHERE "new_admission" = true;

-- ---- staff override on a student -------------------------------------------------------
CREATE TYPE "public"."enum_users_new_admission_override" AS ENUM('new', 'existing');
ALTER TABLE "users" ADD COLUMN "new_admission_override" "public"."enum_users_new_admission_override";

-- ---- when the academic year starts (editable in the console; April by default) -----------
ALTER TABLE "schools" ADD COLUMN "academic_year_start_month" numeric DEFAULT 4;
ALTER TABLE "schools" ADD CONSTRAINT "schools_academic_year_start_month_check" CHECK (
	"academic_year_start_month" IS NULL OR ("academic_year_start_month" >= 1 AND "academic_year_start_month" <= 12)
);

-- ---- remember which order was the new-admission set ---------------------------------------
ALTER TABLE "orders" ADD COLUMN "new_admission_set" boolean DEFAULT false;
-- The database itself guarantees the set is bought only once per student.
CREATE UNIQUE INDEX "orders_one_new_admission_set_per_student" ON "orders" USING btree ("user_id") WHERE "new_admission_set" = true;
ALTER TABLE "payments" ADD COLUMN "new_admission_set" boolean DEFAULT false;
ALTER TABLE "payments" ADD COLUMN "extra_request_ids" jsonb;

-- ---- extra-item requests (new students asking to buy a single extra item) -----------------------
CREATE TYPE "public"."enum_extra_item_requests_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled', 'used');

CREATE TABLE "extra_item_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"uniform_item_id" uuid NOT NULL,
	"item_label" varchar NOT NULL,
	"size" varchar NOT NULL,
	"note" varchar,
	"status" "public"."enum_extra_item_requests_status" DEFAULT 'pending' NOT NULL,
	"staff_note" varchar,
	"handled_by_id" uuid,
	"handled_by_name" varchar,
	"handled_at" timestamp(3) with time zone,
	"used_payment_id" uuid,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "extra_item_requests_note_len" CHECK ("note" IS NULL OR char_length("note") <= 500),
	CONSTRAINT "extra_item_requests_staff_note_len" CHECK ("staff_note" IS NULL OR char_length("staff_note") <= 500)
);
ALTER TABLE "extra_item_requests" ADD CONSTRAINT "extra_item_requests_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "extra_item_requests" ADD CONSTRAINT "extra_item_requests_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "extra_item_requests" ADD CONSTRAINT "extra_item_requests_uniform_item_id_fk" FOREIGN KEY ("uniform_item_id") REFERENCES "public"."uniform_items"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "extra_item_requests" ADD CONSTRAINT "extra_item_requests_handled_by_id_fk" FOREIGN KEY ("handled_by_id") REFERENCES "public"."payload_admins"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "extra_item_requests" ADD CONSTRAINT "extra_item_requests_used_payment_id_fk" FOREIGN KEY ("used_payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;
CREATE INDEX "extra_item_requests_school_status_created_idx" ON "extra_item_requests" USING btree ("school_id", "status", "created_at" DESC);
CREATE INDEX "extra_item_requests_user_created_idx" ON "extra_item_requests" USING btree ("user_id", "created_at" DESC);
CREATE INDEX "extra_item_requests_updated_at_idx" ON "extra_item_requests" USING btree ("updated_at");
CREATE INDEX "extra_item_requests_created_at_idx" ON "extra_item_requests" USING btree ("created_at");
-- One open request per student + item + size (a double tap can't create two).
CREATE UNIQUE INDEX "extra_item_requests_one_open" ON "extra_item_requests" USING btree ("user_id", "uniform_item_id", "size") WHERE "status" IN ('pending', 'approved');
ALTER TABLE "extra_item_requests" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "extra_item_requests" FROM anon, authenticated;
CREATE TRIGGER "extra_item_requests_protect_delete" BEFORE DELETE ON "extra_item_requests" FOR EACH ROW EXECUTE FUNCTION "public"."protect_history_rows"();

ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "extra_item_requests_id" uuid;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_extra_item_requests_fk" FOREIGN KEY ("extra_item_requests_id") REFERENCES "public"."extra_item_requests"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "payload_locked_documents_rels_extra_item_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("extra_item_requests_id");
