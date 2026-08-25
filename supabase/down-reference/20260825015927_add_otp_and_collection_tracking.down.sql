-- Reference only — see the up migration's own note on why "partially-collected"
-- can't be cleanly dropped from the enum without the recreate-the-type dance
-- (same as the stationery-removal precedent), not attempted here since no
-- data loss risk was found and this file exists for documentation only.

ALTER TABLE "users" DROP COLUMN "otp_code_hash";
ALTER TABLE "users" DROP COLUMN "otp_expires_at";
ALTER TABLE "users" DROP COLUMN "otp_verified_at";
ALTER TABLE "orders_items" DROP COLUMN "collected_at";
