import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_books_language" AS ENUM('hindi', 'telugu');
  CREATE TYPE "public"."enum_books_stream" AS ENUM('science', 'economics');
  CREATE TYPE "public"."enum_books_elective" AS ENUM('ena', 'roboticsAI', 'homeScience');
  CREATE TYPE "public"."enum_uniform_items_gender" AS ENUM('male', 'female');
  CREATE TYPE "public"."enum_users_gender" AS ENUM('male', 'female');
  CREATE TYPE "public"."enum_users_academic_language" AS ENUM('hindi', 'telugu');
  CREATE TYPE "public"."enum_users_language_level" AS ENUM('first', 'second');
  CREATE TYPE "public"."enum_users_stream" AS ENUM('science', 'economics');
  CREATE TYPE "public"."enum_users_elective" AS ENUM('ena', 'roboticsAI', 'homeScience');
  ALTER TABLE "books" ADD COLUMN "language" "enum_books_language";
  ALTER TABLE "books" ADD COLUMN "stream" "enum_books_stream";
  ALTER TABLE "books" ADD COLUMN "elective" "enum_books_elective";
  ALTER TABLE "uniform_items" ADD COLUMN "gender" "enum_uniform_items_gender";
  ALTER TABLE "users" ADD COLUMN "section" varchar;
  ALTER TABLE "users" ADD COLUMN "gender" "enum_users_gender";
  ALTER TABLE "users" ADD COLUMN "academic_language" "enum_users_academic_language";
  ALTER TABLE "users" ADD COLUMN "language_level" "enum_users_language_level";
  ALTER TABLE "users" ADD COLUMN "stream" "enum_users_stream";
  ALTER TABLE "users" ADD COLUMN "elective" "enum_users_elective";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "books" DROP COLUMN "language";
  ALTER TABLE "books" DROP COLUMN "stream";
  ALTER TABLE "books" DROP COLUMN "elective";
  ALTER TABLE "uniform_items" DROP COLUMN "gender";
  ALTER TABLE "users" DROP COLUMN "section";
  ALTER TABLE "users" DROP COLUMN "gender";
  ALTER TABLE "users" DROP COLUMN "academic_language";
  ALTER TABLE "users" DROP COLUMN "language_level";
  ALTER TABLE "users" DROP COLUMN "stream";
  ALTER TABLE "users" DROP COLUMN "elective";
  DROP TYPE "public"."enum_books_language";
  DROP TYPE "public"."enum_books_stream";
  DROP TYPE "public"."enum_books_elective";
  DROP TYPE "public"."enum_uniform_items_gender";
  DROP TYPE "public"."enum_users_gender";
  DROP TYPE "public"."enum_users_academic_language";
  DROP TYPE "public"."enum_users_language_level";
  DROP TYPE "public"."enum_users_stream";
  DROP TYPE "public"."enum_users_elective";`)
}
