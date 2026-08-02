DROP INDEX "users_email_idx";
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'student';
  ALTER TABLE "users" ALTER COLUMN "preferred_language" SET DEFAULT 'en';
  ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
  ALTER TABLE "users" ADD COLUMN "username" varchar NOT NULL;
  CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");
