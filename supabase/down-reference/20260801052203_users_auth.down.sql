ALTER TABLE "users_sessions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "users_sessions" CASCADE;
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_users_fk";
  
  DROP INDEX "users_email_idx";
  DROP INDEX "payload_preferences_rels_users_id_idx";
  ALTER TABLE "users" ALTER COLUMN "mobile_number" SET NOT NULL;
  CREATE UNIQUE INDEX "users_mobile_number_idx" ON "users" USING btree ("mobile_number");
  ALTER TABLE "users" DROP COLUMN "email";
  ALTER TABLE "users" DROP COLUMN "reset_password_token";
  ALTER TABLE "users" DROP COLUMN "reset_password_expiration";
  ALTER TABLE "users" DROP COLUMN "salt";
  ALTER TABLE "users" DROP COLUMN "hash";
  ALTER TABLE "users" DROP COLUMN "login_attempts";
  ALTER TABLE "users" DROP COLUMN "lock_until";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN "users_id";
