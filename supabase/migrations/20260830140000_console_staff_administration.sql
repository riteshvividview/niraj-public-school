-- Console Administration: real staff accounts on payload_admins — role,
-- status, invite tracking, OTP challenge state, and a trusted-device list.
-- See src/collections/PayloadAdmins.ts for field-by-field docs.

-- --- Role / status -----------------------------------------------------
CREATE TYPE "public"."enum_payload_admins_role" AS ENUM('administrator', 'staff');
ALTER TABLE "payload_admins" ADD COLUMN "role" "enum_payload_admins_role" DEFAULT 'staff' NOT NULL;
-- Every account that already exists today (the real /admin operator(s))
-- keeps full access — only rows created after this migration, via the new
-- invite flow, default to "staff".
UPDATE "payload_admins" SET "role" = 'administrator';

CREATE TYPE "public"."enum_payload_admins_status" AS ENUM('invited', 'active', 'disabled');
ALTER TABLE "payload_admins" ADD COLUMN "status" "enum_payload_admins_status" DEFAULT 'active' NOT NULL;

-- --- Invite tracking -----------------------------------------------------
ALTER TABLE "payload_admins" ADD COLUMN "invited_by_email" varchar;
ALTER TABLE "payload_admins" ADD COLUMN "invited_at" timestamp(3) with time zone;
ALTER TABLE "payload_admins" ADD COLUMN "last_login_at" timestamp(3) with time zone;

-- --- OTP challenge state (invite acceptance + new-device login) ----------
ALTER TABLE "payload_admins" ADD COLUMN "otp_code_hash" varchar;
ALTER TABLE "payload_admins" ADD COLUMN "otp_expires_at" timestamp(3) with time zone;
ALTER TABLE "payload_admins" ADD COLUMN "otp_verified_at" timestamp(3) with time zone;

-- --- Trusted devices (array field -> child table, same shape as orders_items) --
CREATE TABLE "payload_admins_trusted_devices" (
	"_order" integer NOT NULL,
	"_parent_id" uuid NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"token_hash" varchar NOT NULL,
	"label" varchar,
	"created_at" timestamp(3) with time zone NOT NULL,
	"last_used_at" timestamp(3) with time zone,
	"expires_at" timestamp(3) with time zone NOT NULL
);

ALTER TABLE "payload_admins_trusted_devices" ADD CONSTRAINT "payload_admins_trusted_devices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_admins"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "payload_admins_trusted_devices_order_idx" ON "payload_admins_trusted_devices" USING btree ("_order");
CREATE INDEX "payload_admins_trusted_devices_parent_id_idx" ON "payload_admins_trusted_devices" USING btree ("_parent_id");
