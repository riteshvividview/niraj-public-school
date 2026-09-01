-- Console Administration: a single admin-configured "shared demo access"
-- account (payload_admins.is_shared_demo_account) that skips device/OTP
-- verification on login. See src/collections/PayloadAdmins.ts.
ALTER TABLE "payload_admins" ADD COLUMN "is_shared_demo_account" boolean DEFAULT false;
