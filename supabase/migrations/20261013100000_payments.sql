-- Payment attempts: every time a parent starts paying, a row is written FIRST
-- ("pending"), before any money moves. The order + receipt are created only when
-- the payment is confirmed (by the parent's screen, by the payment provider's
-- webhook, or by a status check) — so a closed tab / power cut can never leave
-- the parent guessing, and a second attempt can never be started blindly.
--
--   pending  -> paid        (provider confirmed; the order + receipt exist)
--   pending  -> failed      (provider reported a failure)
--   pending  -> cancelled   (parent cancelled, after the provider showed no payment)
--   pending  -> expired     (not completed within the timeout, after the same check)
--   cancelled / expired / failed -> paid   ONLY if the provider later confirms money was received
--
-- Provider-neutral: "provider" is "simulated" until a real gateway's keys are set.

CREATE TYPE "public"."enum_payments_status" AS ENUM('pending', 'paid', 'failed', 'cancelled', 'expired');
CREATE TYPE "public"."enum_payments_items_kind" AS ENUM('book', 'uniform', 'program');

CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "public"."enum_payments_status" DEFAULT 'pending' NOT NULL,
	"amount" numeric NOT NULL,
	"currency" varchar DEFAULT 'INR' NOT NULL,
	"method" varchar,
	"provider" varchar NOT NULL,
	"provider_order_id" varchar,
	"provider_payment_id" varchar,
	"items_fingerprint" varchar NOT NULL,
	"expires_at" timestamp(3) with time zone,
	"failure_reason" varchar,
	"completed_at" timestamp(3) with time zone,
	"order_id" uuid,
	"late_success" boolean DEFAULT false,
	"needs_review" boolean DEFAULT false,
	"review_note" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("amount" > 0)
);
ALTER TABLE "payments" ADD CONSTRAINT "payments_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE RESTRICT;
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;
CREATE INDEX "payments_school_idx" ON "payments" USING btree ("school_id");
CREATE INDEX "payments_user_idx" ON "payments" USING btree ("user_id", "created_at" DESC);
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");
CREATE INDEX "payments_updated_at_idx" ON "payments" USING btree ("updated_at");
CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");
-- A student can have only ONE payment in progress — enforced by the database, not just the screen.
CREATE UNIQUE INDEX "payments_one_pending_per_user" ON "payments" USING btree ("user_id") WHERE "status" = 'pending';
-- The provider's own order id maps to exactly one payment.
CREATE UNIQUE INDEX "payments_provider_order_uq" ON "payments" USING btree ("provider", "provider_order_id") WHERE "provider_order_id" IS NOT NULL;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;

-- What the payment is for: a server-priced snapshot of the cart.
CREATE TABLE "payments_items" (
	"_order" integer NOT NULL,
	"_parent_id" uuid NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"kind" "public"."enum_payments_items_kind" NOT NULL,
	"ref_id" varchar NOT NULL,
	"label" varchar NOT NULL,
	"meta" varchar,
	"unit_price" numeric NOT NULL,
	"quantity" numeric NOT NULL
);
ALTER TABLE "payments_items" ADD CONSTRAINT "payments_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE;
CREATE INDEX "payments_items_order_idx" ON "payments_items" USING btree ("_order");
CREATE INDEX "payments_items_parent_id_idx" ON "payments_items" USING btree ("_parent_id");
ALTER TABLE "payments_items" ENABLE ROW LEVEL SECURITY;

-- Payment attempts are permanent records, like orders and receipts.
CREATE TRIGGER "payments_protect_delete" BEFORE DELETE ON "payments" FOR EACH ROW EXECUTE FUNCTION "public"."protect_history_rows"();
CREATE TRIGGER "payments_protect_truncate" BEFORE TRUNCATE ON "payments" FOR EACH STATEMENT EXECUTE FUNCTION "public"."protect_history_rows"();

-- An order created from a payment points back at it; one payment can only ever produce one order.
ALTER TABLE "orders" ADD COLUMN "payment_id" uuid;
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE RESTRICT;
CREATE UNIQUE INDEX "orders_payment_uq" ON "orders" USING btree ("payment_id") WHERE "payment_id" IS NOT NULL;

-- A real gateway can settle with something other than UPI / card / net banking (wallet, EMI, ...).
ALTER TYPE "public"."enum_orders_payment_method" ADD VALUE IF NOT EXISTS 'other';

-- School-level payment settings (administrator-only in the console).
ALTER TABLE "schools"
	ADD COLUMN "payment_duplicate_window_minutes" numeric DEFAULT 30,
	ADD COLUMN "payment_pending_timeout_minutes" numeric DEFAULT 30;
ALTER TABLE "schools" ADD CONSTRAINT "schools_payment_settings_valid" CHECK (
	("payment_duplicate_window_minutes" IS NULL OR ("payment_duplicate_window_minutes" >= 0 AND "payment_duplicate_window_minutes" <= 1440))
	AND ("payment_pending_timeout_minutes" IS NULL OR ("payment_pending_timeout_minutes" >= 5 AND "payment_pending_timeout_minutes" <= 1440))
);
