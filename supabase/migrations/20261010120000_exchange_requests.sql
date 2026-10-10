-- Uniform Exchange feature.
--
-- Adds the "exchange-requests" collection (a parent's request to swap a
-- collected uniform line for another size, approved/rejected by staff), a
-- per-school extra notification inbox, and an atomic completion function.
--
-- Hand-written, same precedent as 20260825065628_essentials_stock.sql:
-- the drizzle diff is not usable on this project, so the SQL follows
-- Payload's naming conventions (verified against the existing collections).
--
-- Security posture (deliberately stricter than the older tables):
--   * RLS enabled and NO privileges for anon/authenticated — Payload connects
--     with the privileged DATABASE_URI role and is unaffected.
--   * Foreign keys are ON DELETE RESTRICT: request history must never be
--     orphaned or silently nulled.
--   * The completion function is not executable by anon/authenticated.

CREATE TYPE "public"."enum_exchange_requests_reason" AS ENUM('size-too-small', 'size-too-large', 'defect', 'other');
CREATE TYPE "public"."enum_exchange_requests_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled', 'completed');

CREATE TABLE "exchange_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"receipt_id" uuid NOT NULL,
	"order_item_id" varchar NOT NULL,
	"uniform_item_id" varchar NOT NULL,
	"item_label" varchar NOT NULL,
	"from_size" varchar NOT NULL,
	"to_size" varchar NOT NULL,
	"quantity" numeric DEFAULT 1 NOT NULL,
	"from_unit_price" numeric NOT NULL,
	"to_unit_price" numeric NOT NULL,
	"price_difference" numeric NOT NULL,
	"reason" "public"."enum_exchange_requests_reason" NOT NULL,
	"note" varchar,
	"status" "public"."enum_exchange_requests_status" DEFAULT 'pending' NOT NULL,
	"staff_note" varchar,
	"contact_note" varchar,
	"decided_by_id" uuid,
	"decided_by_name" varchar,
	"decided_at" timestamp(3) with time zone,
	"completed_by_id" uuid,
	"completed_by_name" varchar,
	"completed_at" timestamp(3) with time zone,
	"returned_to_stock" boolean,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exchange_requests_quantity_positive" CHECK ("quantity" >= 1 AND "quantity" = floor("quantity")),
	CONSTRAINT "exchange_requests_size_changes" CHECK ("from_size" <> "to_size"),
	CONSTRAINT "exchange_requests_prices_nonneg" CHECK ("from_unit_price" >= 0 AND "to_unit_price" >= 0),
	CONSTRAINT "exchange_requests_note_len" CHECK ("note" IS NULL OR char_length("note") <= 300),
	CONSTRAINT "exchange_requests_staff_note_len" CHECK ("staff_note" IS NULL OR char_length("staff_note") <= 500),
	CONSTRAINT "exchange_requests_contact_note_len" CHECK ("contact_note" IS NULL OR char_length("contact_note") <= 1000),
	-- A decided/completed request must carry who and when.
	CONSTRAINT "exchange_requests_decision_complete" CHECK (
		"status" NOT IN ('approved', 'rejected', 'completed') OR "decided_at" IS NOT NULL
	),
	CONSTRAINT "exchange_requests_completion_complete" CHECK (
		"status" <> 'completed' OR "completed_at" IS NOT NULL
	)
);

ALTER TABLE "exchange_requests" ADD CONSTRAINT "exchange_requests_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "exchange_requests" ADD CONSTRAINT "exchange_requests_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "exchange_requests" ADD CONSTRAINT "exchange_requests_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "exchange_requests" ADD CONSTRAINT "exchange_requests_receipt_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE restrict ON UPDATE no action;
-- Staff accounts can be removed later; the *_name snapshot columns keep the audit trail readable.
ALTER TABLE "exchange_requests" ADD CONSTRAINT "exchange_requests_decided_by_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "public"."payload_admins"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "exchange_requests" ADD CONSTRAINT "exchange_requests_completed_by_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."payload_admins"("id") ON DELETE set null ON UPDATE no action;

-- At most ONE open (pending/approved) request per order line — what makes a
-- double-tap on "Request exchange" safe at the database level.
CREATE UNIQUE INDEX "exchange_requests_one_open_per_item_idx" ON "exchange_requests" USING btree ("order_id", "order_item_id") WHERE "status" IN ('pending', 'approved');

CREATE INDEX "exchange_requests_school_status_created_idx" ON "exchange_requests" USING btree ("school_id", "status", "created_at" DESC);
CREATE INDEX "exchange_requests_user_created_idx" ON "exchange_requests" USING btree ("user_id", "created_at" DESC);
CREATE INDEX "exchange_requests_order_idx" ON "exchange_requests" USING btree ("order_id");
CREATE INDEX "exchange_requests_receipt_idx" ON "exchange_requests" USING btree ("receipt_id");
CREATE INDEX "exchange_requests_updated_at_idx" ON "exchange_requests" USING btree ("updated_at");
CREATE INDEX "exchange_requests_created_at_idx" ON "exchange_requests" USING btree ("created_at");

ALTER TABLE "exchange_requests" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "exchange_requests" FROM anon, authenticated;

-- --- schools: extra notification inbox ------------------------------------
ALTER TABLE "schools" ADD COLUMN "request_notify_email" varchar;

-- --- payload_locked_documents_rels: register the new collection ------------
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "exchange_requests_id" uuid;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_exchange_requests_fk" FOREIGN KEY ("exchange_requests_id") REFERENCES "public"."exchange_requests"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "payload_locked_documents_rels_exchange_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("exchange_requests_id");

-- --- complete_exchange_request ----------------------------------------------
-- Marks an APPROVED exchange as physically done at the counter and moves
-- stock, all in one transaction:
--   * the request row is locked, so two staff clicking "Complete" cannot both
--     run (the second sees status = 'completed' and is rejected);
--   * the new size's stock is decremented only if enough is on hand — never
--     below zero; an untracked product (no essentials_stock row) is skipped,
--     matching the rule in Receipts.ts;
--   * the returned size is added back unless staff say the item is unfit
--     for resale (p_return_to_stock = false, e.g. defective).
-- Raises one of: EXCHANGE_NOT_FOUND, EXCHANGE_BAD_STATUS:<status>,
-- EXCHANGE_INSUFFICIENT_STOCK:<on hand>.
CREATE OR REPLACE FUNCTION "public"."complete_exchange_request"(
	p_request_id uuid,
	p_admin_id uuid,
	p_admin_name text,
	p_return_to_stock boolean
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
	r exchange_requests%ROWTYPE;
	new_row essentials_stock%ROWTYPE;
	old_updated integer := 0;
	new_updated integer := 0;
BEGIN
	SELECT * INTO r FROM exchange_requests WHERE id = p_request_id FOR UPDATE;
	IF NOT FOUND THEN
		RAISE EXCEPTION 'EXCHANGE_NOT_FOUND';
	END IF;
	IF r.status <> 'approved' THEN
		RAISE EXCEPTION 'EXCHANGE_BAD_STATUS:%', r.status;
	END IF;

	SELECT * INTO new_row FROM essentials_stock
		WHERE school_id = r.school_id AND kind = 'uniform' AND ref_id = r.uniform_item_id AND variant_key = r.to_size
		FOR UPDATE;
	IF FOUND THEN
		IF new_row.quantity_on_hand < r.quantity THEN
			RAISE EXCEPTION 'EXCHANGE_INSUFFICIENT_STOCK:%', new_row.quantity_on_hand;
		END IF;
		UPDATE essentials_stock SET quantity_on_hand = quantity_on_hand - r.quantity, updated_at = now() WHERE id = new_row.id;
		new_updated := 1;
	END IF;

	IF p_return_to_stock THEN
		UPDATE essentials_stock SET quantity_on_hand = quantity_on_hand + r.quantity, updated_at = now()
			WHERE school_id = r.school_id AND kind = 'uniform' AND ref_id = r.uniform_item_id AND variant_key = r.from_size;
		GET DIAGNOSTICS old_updated = ROW_COUNT;
	END IF;

	UPDATE exchange_requests SET
		status = 'completed',
		completed_by_id = p_admin_id,
		completed_by_name = p_admin_name,
		completed_at = now(),
		returned_to_stock = p_return_to_stock,
		updated_at = now()
	WHERE id = r.id;

	RETURN jsonb_build_object('ok', true, 'newSizeStockAdjusted', new_updated = 1, 'oldSizeStockAdjusted', old_updated > 0);
END;
$$;

REVOKE ALL ON FUNCTION "public"."complete_exchange_request"(uuid, uuid, text, boolean) FROM PUBLIC, anon, authenticated;
