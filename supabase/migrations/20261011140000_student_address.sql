-- Optional delivery address for every student.
--
-- Parents can add it from Profile (typed in, or "use my live location" with a
-- confirmation step and the flat/house number they must add themselves); staff
-- can add/edit it from the console. It is OPTIONAL — a student with no address
-- is simply NULL in every column — but when one is saved it must be complete
-- enough to deliver to (house, street, city, state, pincode).
--
-- Stored as columns on "users" (Payload group field "address" -> address_*),
-- so it appears wherever a student record is read.

CREATE TYPE "public"."enum_users_address_source" AS ENUM('manual', 'live-location');

ALTER TABLE "users"
	ADD COLUMN "address_house" varchar,
	ADD COLUMN "address_street" varchar,
	ADD COLUMN "address_landmark" varchar,
	ADD COLUMN "address_city" varchar,
	ADD COLUMN "address_state" varchar,
	ADD COLUMN "address_pincode" varchar,
	ADD COLUMN "address_phone" varchar,
	ADD COLUMN "address_latitude" numeric,
	ADD COLUMN "address_longitude" numeric,
	ADD COLUMN "address_source" "public"."enum_users_address_source",
	ADD COLUMN "address_updated_at" timestamp(3) with time zone;

-- Either no address at all, or a complete deliverable one.
ALTER TABLE "users" ADD CONSTRAINT "users_address_complete" CHECK (
	(
		"address_house" IS NULL AND "address_street" IS NULL AND "address_city" IS NULL
		AND "address_state" IS NULL AND "address_pincode" IS NULL
	) OR (
		"address_house" IS NOT NULL AND "address_street" IS NOT NULL AND "address_city" IS NOT NULL
		AND "address_state" IS NOT NULL AND "address_pincode" IS NOT NULL
	)
);
-- Indian PIN: six digits, never starting with 0.
ALTER TABLE "users" ADD CONSTRAINT "users_address_pincode_format" CHECK ("address_pincode" IS NULL OR "address_pincode" ~ '^[1-9][0-9]{5}$');
ALTER TABLE "users" ADD CONSTRAINT "users_address_coords_valid" CHECK (
	("address_latitude" IS NULL AND "address_longitude" IS NULL)
	OR ("address_latitude" BETWEEN -90 AND 90 AND "address_longitude" BETWEEN -180 AND 180)
);
ALTER TABLE "users" ADD CONSTRAINT "users_address_lengths" CHECK (
	char_length(coalesce("address_house", '')) <= 150
	AND char_length(coalesce("address_street", '')) <= 250
	AND char_length(coalesce("address_landmark", '')) <= 150
	AND char_length(coalesce("address_city", '')) <= 100
	AND char_length(coalesce("address_state", '')) <= 100
	AND char_length(coalesce("address_phone", '')) <= 20
);
