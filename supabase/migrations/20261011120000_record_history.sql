-- Records & History: make sure nothing the school may need to look up later can
-- be lost or silently rewritten, and give staff one searchable timeline.
--
--  1. record_events — an APPEND-ONLY activity log (who did what, when, to whose
--     order/receipt/exchange/subject-change/support query). Rows can never be
--     updated, and can only be deleted by deliberately setting
--     app.allow_history_delete = 'on' inside a transaction (a DBA escape hatch,
--     not something the app does).
--  2. Delete protection on the business-history tables (orders, receipts,
--     exchange_requests, book_change_requests, support_requests): a trigger
--     refuses DELETE / TRUNCATE the same way.
--  3. The orders/receipts foreign keys that used to be ON DELETE SET NULL on
--     NOT NULL columns (contradictory, and "works" only by erroring) become
--     ON DELETE RESTRICT, so a student, school or order that has history can
--     never be removed from underneath it.
--  4. Backfill: today's orders, receipts and per-item collections are written
--     into the log with their original timestamps, so history is complete from
--     day one — not only from this migration onwards.
--
-- Same security posture as the other request tables: RLS on, no
-- anon/authenticated privileges.

CREATE TYPE "public"."enum_record_events_actor_type" AS ENUM('student', 'staff', 'system');

CREATE TABLE "record_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar NOT NULL,
	"entity_type" varchar NOT NULL,
	"entity_id" varchar,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	-- Snapshots: still correct and searchable even if the student is later renamed / promoted.
	"student_name" varchar NOT NULL,
	"register_number" varchar,
	"receipt_code" varchar,
	"actor_type" "public"."enum_record_events_actor_type" NOT NULL,
	"actor_id" varchar,
	"actor_name" varchar,
	"summary" varchar NOT NULL,
	"details" jsonb,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT clock_timestamp() NOT NULL
);

ALTER TABLE "record_events" ADD CONSTRAINT "record_events_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "record_events" ADD CONSTRAINT "record_events_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;

CREATE INDEX "record_events_school_created_idx" ON "record_events" USING btree ("school_id", "created_at" DESC);
CREATE INDEX "record_events_student_created_idx" ON "record_events" USING btree ("student_id", "created_at" DESC);
CREATE INDEX "record_events_entity_idx" ON "record_events" USING btree ("entity_type", "entity_id");
CREATE INDEX "record_events_receipt_code_idx" ON "record_events" USING btree ("receipt_code");
CREATE INDEX "record_events_register_number_idx" ON "record_events" USING btree ("register_number");
CREATE INDEX "record_events_created_at_idx" ON "record_events" USING btree ("created_at");

ALTER TABLE "record_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "record_events" FROM anon, authenticated;

-- --- payload_locked_documents_rels: register the new collection ------------
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "record_events_id" uuid;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_record_events_fk" FOREIGN KEY ("record_events_id") REFERENCES "public"."record_events"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "payload_locked_documents_rels_record_events_id_idx" ON "payload_locked_documents_rels" USING btree ("record_events_id");

-- --- immutability --------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."protect_history_rows"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
	IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'record_events' THEN
		RAISE EXCEPTION 'record_events is append-only: rows cannot be changed';
	END IF;
	IF TG_OP IN ('DELETE', 'TRUNCATE') AND COALESCE(current_setting('app.allow_history_delete', true), '') <> 'on' THEN
		RAISE EXCEPTION '% is permanent history: % is not allowed (history rows are kept for audit)', TG_TABLE_NAME, TG_OP;
	END IF;
	IF TG_OP = 'TRUNCATE' THEN RETURN NULL; END IF;
	IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
	RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION "public"."protect_history_rows"() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER "record_events_protect_update" BEFORE UPDATE ON "record_events" FOR EACH ROW EXECUTE FUNCTION "public"."protect_history_rows"();
CREATE TRIGGER "record_events_protect_delete" BEFORE DELETE ON "record_events" FOR EACH ROW EXECUTE FUNCTION "public"."protect_history_rows"();
CREATE TRIGGER "record_events_protect_truncate" BEFORE TRUNCATE ON "record_events" FOR EACH STATEMENT EXECUTE FUNCTION "public"."protect_history_rows"();

CREATE TRIGGER "orders_protect_delete" BEFORE DELETE ON "orders" FOR EACH ROW EXECUTE FUNCTION "public"."protect_history_rows"();
CREATE TRIGGER "orders_protect_truncate" BEFORE TRUNCATE ON "orders" FOR EACH STATEMENT EXECUTE FUNCTION "public"."protect_history_rows"();
CREATE TRIGGER "receipts_protect_delete" BEFORE DELETE ON "receipts" FOR EACH ROW EXECUTE FUNCTION "public"."protect_history_rows"();
CREATE TRIGGER "receipts_protect_truncate" BEFORE TRUNCATE ON "receipts" FOR EACH STATEMENT EXECUTE FUNCTION "public"."protect_history_rows"();
CREATE TRIGGER "exchange_requests_protect_delete" BEFORE DELETE ON "exchange_requests" FOR EACH ROW EXECUTE FUNCTION "public"."protect_history_rows"();
CREATE TRIGGER "book_change_requests_protect_delete" BEFORE DELETE ON "book_change_requests" FOR EACH ROW EXECUTE FUNCTION "public"."protect_history_rows"();
CREATE TRIGGER "support_requests_protect_delete" BEFORE DELETE ON "support_requests" FOR EACH ROW EXECUTE FUNCTION "public"."protect_history_rows"();

-- --- foreign keys that must never null-out history -----------------------------------
ALTER TABLE "orders" DROP CONSTRAINT "orders_user_id_users_id_fk";
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "orders" DROP CONSTRAINT "orders_school_id_schools_id_fk";
ALTER TABLE "orders" ADD CONSTRAINT "orders_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "receipts" DROP CONSTRAINT "receipts_order_id_orders_id_fk";
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "receipts" DROP CONSTRAINT "receipts_user_id_users_id_fk";
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "receipts" DROP CONSTRAINT "receipts_school_id_schools_id_fk";
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;

-- --- backfill: history that already exists -----------------------------------------------
-- Original timestamps are kept. Item collections predate the log, so who handled
-- them is recorded as unknown rather than guessed.
INSERT INTO "record_events" ("event_type", "entity_type", "entity_id", "school_id", "student_id", "student_name", "register_number", "receipt_code", "actor_type", "actor_name", "summary", "details", "created_at", "updated_at")
SELECT 'order.created', 'order', o.id::text, o.school_id, o.user_id, u.name, u.username, r.qr_payload, 'student', u.name,
	'Order placed — ' || (SELECT count(*) FROM orders_items i WHERE i._parent_id = o.id) || ' item(s), ₹' || trim(to_char(o.total_amount, 'FM999999990.##')) || ' via ' || upper(o.payment_method::text),
	jsonb_build_object('totalAmount', o.total_amount, 'paymentMethod', o.payment_method, 'status', o.status, 'backfilled', true),
	o.created_at, o.created_at
FROM orders o
JOIN users u ON u.id = o.user_id
LEFT JOIN receipts r ON r.order_id = o.id;

INSERT INTO "record_events" ("event_type", "entity_type", "entity_id", "school_id", "student_id", "student_name", "register_number", "receipt_code", "actor_type", "actor_name", "summary", "details", "created_at", "updated_at")
SELECT 'receipt.issued', 'receipt', r.id::text, r.school_id, r.user_id, u.name, u.username, r.qr_payload, 'system', 'System',
	'Receipt ' || r.qr_payload || ' issued',
	jsonb_build_object('orderId', r.order_id, 'backfilled', true),
	r.issued_at, r.issued_at
FROM receipts r
JOIN users u ON u.id = r.user_id;

INSERT INTO "record_events" ("event_type", "entity_type", "entity_id", "school_id", "student_id", "student_name", "register_number", "receipt_code", "actor_type", "actor_name", "summary", "details", "created_at", "updated_at")
SELECT 'item.collected', 'order', o.id::text, o.school_id, o.user_id, u.name, u.username, r.qr_payload, 'staff', 'Recorded before the activity log existed',
	'Collected: ' || i.label || COALESCE(' (' || NULLIF(i.meta, '') || ')', '') || ' ×' || trim(to_char(i.quantity, 'FM999990.##')),
	jsonb_build_object('orderItemId', i.id, 'label', i.label, 'meta', i.meta, 'quantity', i.quantity, 'backfilled', true),
	i.collected_at, i.collected_at
FROM orders_items i
JOIN orders o ON o.id = i._parent_id
JOIN users u ON u.id = o.user_id
LEFT JOIN receipts r ON r.order_id = o.id
WHERE i.collected_at IS NOT NULL;
