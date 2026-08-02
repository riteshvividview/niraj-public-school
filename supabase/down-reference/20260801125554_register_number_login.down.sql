DROP INDEX "users_username_idx";
  ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
  ALTER TABLE "users" ALTER COLUMN "preferred_language" DROP DEFAULT;
  ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  ALTER TABLE "users" DROP COLUMN "username";
