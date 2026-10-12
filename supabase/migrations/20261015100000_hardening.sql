-- Database hardening (re-audit of 2026-10-12). Nothing here deletes or rewrites existing data.
--
-- The app talks to Postgres through its own privileged connection (Payload), never through Supabase's
-- public API, so the public roles (anon / authenticated) need no access to any table.

-- ---- 1. Row-level security on the five tables that had it off --------------------------------------
ALTER TABLE "users_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "media" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "programs_rels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "essentials_stock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payload_admins_trusted_devices" ENABLE ROW LEVEL SECURITY;

-- ---- 2. The public roles hold no privileges on our tables or sequences -------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- ---- 3. Receipts: one per order, one code per receipt (the code is also what the scanner looks up) ----
CREATE UNIQUE INDEX IF NOT EXISTS "receipts_order_uq" ON "receipts" ("order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "receipts_qr_payload_uq" ON "receipts" ("qr_payload");

-- ---- 4. Indexes for the screens that grow with the school ---------------------------------------------
CREATE INDEX IF NOT EXISTS "orders_user_created_idx" ON "orders" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "orders_school_status_created_idx" ON "orders" ("school_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "receipts_school_status_idx" ON "receipts" ("school_id", "redemption_status");
CREATE INDEX IF NOT EXISTS "receipts_user_created_idx" ON "receipts" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "orders_items_kind_ref_idx" ON "orders_items" ("kind", "ref_id");

-- foreign keys the advisor flagged as unindexed
CREATE INDEX IF NOT EXISTS "payments_order_idx" ON "payments" ("order_id");
CREATE INDEX IF NOT EXISTS "extra_item_requests_uniform_item_idx" ON "extra_item_requests" ("uniform_item_id");
CREATE INDEX IF NOT EXISTS "extra_item_requests_used_payment_idx" ON "extra_item_requests" ("used_payment_id");
CREATE INDEX IF NOT EXISTS "extra_item_requests_handled_by_idx" ON "extra_item_requests" ("handled_by_id");
CREATE INDEX IF NOT EXISTS "exchange_requests_decided_by_idx" ON "exchange_requests" ("decided_by_id");
CREATE INDEX IF NOT EXISTS "exchange_requests_completed_by_idx" ON "exchange_requests" ("completed_by_id");
CREATE INDEX IF NOT EXISTS "book_change_requests_decided_by_idx" ON "book_change_requests" ("decided_by_id");
CREATE INDEX IF NOT EXISTS "support_requests_handled_by_idx" ON "support_requests" ("handled_by_id");

-- ---- 5. Housekeeping: expired logins and one-time codes ---------------------------------------------
-- Run daily by /api/cron/cleanup. Only ever touches rows that have already expired; never orders,
-- receipts, payments or the activity log.
CREATE OR REPLACE FUNCTION cleanup_expired_auth_rows() RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
	student_sessions integer;
	staff_sessions integer;
	devices integer;
	student_otps integer;
	staff_otps integer;
BEGIN
	DELETE FROM users_sessions WHERE expires_at < now();
	GET DIAGNOSTICS student_sessions = ROW_COUNT;
	DELETE FROM payload_admins_sessions WHERE expires_at < now();
	GET DIAGNOSTICS staff_sessions = ROW_COUNT;
	DELETE FROM payload_admins_trusted_devices WHERE expires_at < now();
	GET DIAGNOSTICS devices = ROW_COUNT;
	UPDATE users SET otp_code_hash = NULL, otp_expires_at = NULL, otp_verified_at = NULL
	 WHERE otp_expires_at IS NOT NULL AND otp_expires_at < now() - interval '1 day';
	GET DIAGNOSTICS student_otps = ROW_COUNT;
	UPDATE payload_admins SET otp_code_hash = NULL, otp_expires_at = NULL, otp_verified_at = NULL
	 WHERE otp_expires_at IS NOT NULL AND otp_expires_at < now() - interval '1 day';
	GET DIAGNOSTICS staff_otps = ROW_COUNT;
	RETURN jsonb_build_object(
		'studentSessions', student_sessions, 'staffSessions', staff_sessions, 'trustedDevices', devices,
		'studentOtps', student_otps, 'staffOtps', staff_otps);
END;
$$;
REVOKE ALL ON FUNCTION cleanup_expired_auth_rows() FROM PUBLIC, anon, authenticated;
