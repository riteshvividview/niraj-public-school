CREATE TYPE "public"."enum_uniform_items_category" AS ENUM('uniform', 'kit');
  CREATE TYPE "public"."enum_programs_category" AS ENUM('workshop', 'sports', 'camp', 'annual-day', 'exhibition', 'extra-class');
  CREATE TYPE "public"."enum_programs_status" AS ENUM('open', 'filling-fast', 'full', 'closed');
  CREATE TYPE "public"."enum_users_role" AS ENUM('parent', 'student');
  CREATE TYPE "public"."enum_users_preferred_language" AS ENUM('en', 'hi', 'te');
  CREATE TYPE "public"."enum_orders_items_kind" AS ENUM('book', 'uniform', 'stationery', 'program');
  CREATE TYPE "public"."enum_orders_payment_method" AS ENUM('upi', 'card', 'netbanking');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('paid', 'pending', 'failed', 'refunded');
  CREATE TYPE "public"."enum_receipts_redemption_status" AS ENUM('ready', 'collected', 'checked-in');
  CREATE TABLE "payload_admins_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload_admins" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "schools" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"city" varchar NOT NULL,
  	"state" varchar NOT NULL,
  	"logo_url" varchar,
  	"contact_phone" varchar NOT NULL,
  	"contact_email" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "class_levels" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"school_id" uuid NOT NULL,
  	"label" varchar NOT NULL,
  	"board" varchar NOT NULL,
  	"order" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "books" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"school_id" uuid NOT NULL,
  	"class_level_id" uuid NOT NULL,
  	"title" varchar NOT NULL,
  	"subject" varchar NOT NULL,
  	"author" varchar,
  	"price" numeric NOT NULL,
  	"cover_image_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "uniform_items_size_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"size" varchar NOT NULL,
  	"price" numeric NOT NULL
  );
  
  CREATE TABLE "uniform_items" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"school_id" uuid NOT NULL,
  	"class_level_id" uuid NOT NULL,
  	"name" varchar NOT NULL,
  	"category" "enum_uniform_items_category" NOT NULL,
  	"description" varchar,
  	"image_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "stationery_items" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"school_id" uuid NOT NULL,
  	"class_level_id" uuid NOT NULL,
  	"name" varchar NOT NULL,
  	"quantity_label" varchar NOT NULL,
  	"price" numeric NOT NULL,
  	"image_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "programs" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"school_id" uuid NOT NULL,
  	"title" varchar NOT NULL,
  	"category" "enum_programs_category" NOT NULL,
  	"description" varchar NOT NULL,
  	"venue" varchar NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"fee" numeric NOT NULL,
  	"seats_total" numeric NOT NULL,
  	"seats_available" numeric NOT NULL,
  	"status" "enum_programs_status" DEFAULT 'open' NOT NULL,
  	"contact_phone" varchar NOT NULL,
  	"image_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"mobile_number" varchar NOT NULL,
  	"role" "enum_users_role" NOT NULL,
  	"school_id" uuid NOT NULL,
  	"class_level_id" uuid NOT NULL,
  	"preferred_language" "enum_users_preferred_language" NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "orders_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_orders_items_kind" NOT NULL,
  	"ref_id" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"meta" varchar,
  	"unit_price" numeric NOT NULL,
  	"quantity" numeric NOT NULL
  );
  
  CREATE TABLE "orders" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"user_id" uuid NOT NULL,
  	"school_id" uuid NOT NULL,
  	"total_amount" numeric NOT NULL,
  	"payment_method" "enum_orders_payment_method" NOT NULL,
  	"status" "enum_orders_status" DEFAULT 'paid' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "receipts" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"order_id" uuid NOT NULL,
  	"user_id" uuid NOT NULL,
  	"school_id" uuid NOT NULL,
  	"qr_payload" varchar NOT NULL,
  	"redemption_status" "enum_receipts_redemption_status" DEFAULT 'ready' NOT NULL,
  	"issued_at" timestamp(3) with time zone NOT NULL,
  	"redeemed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"payload_admins_id" uuid,
  	"schools_id" uuid,
  	"class_levels_id" uuid,
  	"books_id" uuid,
  	"uniform_items_id" uuid,
  	"stationery_items_id" uuid,
  	"programs_id" uuid,
  	"users_id" uuid,
  	"orders_id" uuid,
  	"receipts_id" uuid
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"payload_admins_id" uuid
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_admins_sessions" ADD CONSTRAINT "payload_admins_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_levels" ADD CONSTRAINT "class_levels_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "books" ADD CONSTRAINT "books_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "books" ADD CONSTRAINT "books_class_level_id_class_levels_id_fk" FOREIGN KEY ("class_level_id") REFERENCES "public"."class_levels"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "uniform_items_size_options" ADD CONSTRAINT "uniform_items_size_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."uniform_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "uniform_items" ADD CONSTRAINT "uniform_items_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "uniform_items" ADD CONSTRAINT "uniform_items_class_level_id_class_levels_id_fk" FOREIGN KEY ("class_level_id") REFERENCES "public"."class_levels"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stationery_items" ADD CONSTRAINT "stationery_items_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stationery_items" ADD CONSTRAINT "stationery_items_class_level_id_class_levels_id_fk" FOREIGN KEY ("class_level_id") REFERENCES "public"."class_levels"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "programs" ADD CONSTRAINT "programs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_class_level_id_class_levels_id_fk" FOREIGN KEY ("class_level_id") REFERENCES "public"."class_levels"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "receipts" ADD CONSTRAINT "receipts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "receipts" ADD CONSTRAINT "receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "receipts" ADD CONSTRAINT "receipts_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payload_admins_fk" FOREIGN KEY ("payload_admins_id") REFERENCES "public"."payload_admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_schools_fk" FOREIGN KEY ("schools_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_class_levels_fk" FOREIGN KEY ("class_levels_id") REFERENCES "public"."class_levels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_books_fk" FOREIGN KEY ("books_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_uniform_items_fk" FOREIGN KEY ("uniform_items_id") REFERENCES "public"."uniform_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stationery_items_fk" FOREIGN KEY ("stationery_items_id") REFERENCES "public"."stationery_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_programs_fk" FOREIGN KEY ("programs_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_receipts_fk" FOREIGN KEY ("receipts_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_payload_admins_fk" FOREIGN KEY ("payload_admins_id") REFERENCES "public"."payload_admins"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_admins_sessions_order_idx" ON "payload_admins_sessions" USING btree ("_order");
  CREATE INDEX "payload_admins_sessions_parent_id_idx" ON "payload_admins_sessions" USING btree ("_parent_id");
  CREATE INDEX "payload_admins_updated_at_idx" ON "payload_admins" USING btree ("updated_at");
  CREATE INDEX "payload_admins_created_at_idx" ON "payload_admins" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_admins_email_idx" ON "payload_admins" USING btree ("email");
  CREATE UNIQUE INDEX "schools_slug_idx" ON "schools" USING btree ("slug");
  CREATE INDEX "schools_updated_at_idx" ON "schools" USING btree ("updated_at");
  CREATE INDEX "schools_created_at_idx" ON "schools" USING btree ("created_at");
  CREATE INDEX "class_levels_school_idx" ON "class_levels" USING btree ("school_id");
  CREATE INDEX "class_levels_updated_at_idx" ON "class_levels" USING btree ("updated_at");
  CREATE INDEX "class_levels_created_at_idx" ON "class_levels" USING btree ("created_at");
  CREATE INDEX "books_school_idx" ON "books" USING btree ("school_id");
  CREATE INDEX "books_class_level_idx" ON "books" USING btree ("class_level_id");
  CREATE INDEX "books_updated_at_idx" ON "books" USING btree ("updated_at");
  CREATE INDEX "books_created_at_idx" ON "books" USING btree ("created_at");
  CREATE INDEX "uniform_items_size_options_order_idx" ON "uniform_items_size_options" USING btree ("_order");
  CREATE INDEX "uniform_items_size_options_parent_id_idx" ON "uniform_items_size_options" USING btree ("_parent_id");
  CREATE INDEX "uniform_items_school_idx" ON "uniform_items" USING btree ("school_id");
  CREATE INDEX "uniform_items_class_level_idx" ON "uniform_items" USING btree ("class_level_id");
  CREATE INDEX "uniform_items_updated_at_idx" ON "uniform_items" USING btree ("updated_at");
  CREATE INDEX "uniform_items_created_at_idx" ON "uniform_items" USING btree ("created_at");
  CREATE INDEX "stationery_items_school_idx" ON "stationery_items" USING btree ("school_id");
  CREATE INDEX "stationery_items_class_level_idx" ON "stationery_items" USING btree ("class_level_id");
  CREATE INDEX "stationery_items_updated_at_idx" ON "stationery_items" USING btree ("updated_at");
  CREATE INDEX "stationery_items_created_at_idx" ON "stationery_items" USING btree ("created_at");
  CREATE INDEX "programs_school_idx" ON "programs" USING btree ("school_id");
  CREATE INDEX "programs_updated_at_idx" ON "programs" USING btree ("updated_at");
  CREATE INDEX "programs_created_at_idx" ON "programs" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_mobile_number_idx" ON "users" USING btree ("mobile_number");
  CREATE INDEX "users_school_idx" ON "users" USING btree ("school_id");
  CREATE INDEX "users_class_level_idx" ON "users" USING btree ("class_level_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE INDEX "orders_items_order_idx" ON "orders_items" USING btree ("_order");
  CREATE INDEX "orders_items_parent_id_idx" ON "orders_items" USING btree ("_parent_id");
  CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");
  CREATE INDEX "orders_school_idx" ON "orders" USING btree ("school_id");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE INDEX "receipts_order_idx" ON "receipts" USING btree ("order_id");
  CREATE INDEX "receipts_user_idx" ON "receipts" USING btree ("user_id");
  CREATE INDEX "receipts_school_idx" ON "receipts" USING btree ("school_id");
  CREATE INDEX "receipts_updated_at_idx" ON "receipts" USING btree ("updated_at");
  CREATE INDEX "receipts_created_at_idx" ON "receipts" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_payload_admins_id_idx" ON "payload_locked_documents_rels" USING btree ("payload_admins_id");
  CREATE INDEX "payload_locked_documents_rels_schools_id_idx" ON "payload_locked_documents_rels" USING btree ("schools_id");
  CREATE INDEX "payload_locked_documents_rels_class_levels_id_idx" ON "payload_locked_documents_rels" USING btree ("class_levels_id");
  CREATE INDEX "payload_locked_documents_rels_books_id_idx" ON "payload_locked_documents_rels" USING btree ("books_id");
  CREATE INDEX "payload_locked_documents_rels_uniform_items_id_idx" ON "payload_locked_documents_rels" USING btree ("uniform_items_id");
  CREATE INDEX "payload_locked_documents_rels_stationery_items_id_idx" ON "payload_locked_documents_rels" USING btree ("stationery_items_id");
  CREATE INDEX "payload_locked_documents_rels_programs_id_idx" ON "payload_locked_documents_rels" USING btree ("programs_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_receipts_id_idx" ON "payload_locked_documents_rels" USING btree ("receipts_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_payload_admins_id_idx" ON "payload_preferences_rels" USING btree ("payload_admins_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
