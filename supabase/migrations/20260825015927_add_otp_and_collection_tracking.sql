-- Adds: (1) OTP state for self-service change-password, (2) per-item
-- collection tracking on orders_items, (3) the "partially-collected"
-- receipt status.
--
-- Note: users.email already exists (left over from the original
-- email/password auth phase before the switch to register-number login —
-- see .claude/DECISIONS.md) — no migration needed for it, just started
-- actually using it in the app.

-- --- OTP state (users) -------------------------------------------------
ALTER TABLE "users" ADD COLUMN "otp_code_hash" varchar;
ALTER TABLE "users" ADD COLUMN "otp_expires_at" timestamp(3) with time zone;
ALTER TABLE "users" ADD COLUMN "otp_verified_at" timestamp(3) with time zone;

-- --- Per-item collection tracking (orders_items) ------------------------
ALTER TABLE "orders_items" ADD COLUMN "collected_at" timestamp(3) with time zone;

-- --- Receipt rollup status: add "partially-collected" -------------------
-- Adding a value is simple (unlike removing one) — no enum-recreate dance.
ALTER TYPE "public"."enum_receipts_redemption_status" ADD VALUE 'partially-collected' BEFORE 'collected';
