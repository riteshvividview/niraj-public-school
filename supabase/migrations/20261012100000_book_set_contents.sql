-- What is inside a book set, and which of it has been handed over.
--
-- Parents still buy ONE book set at ONE price (the "books" row); nothing here
-- has a price. The school lists the textbooks, notebooks and stationery that
-- make up the set ("books_contents"), and when an order is placed that list is
-- copied onto the order line ("orders_items_parts") so staff can tick off each
-- item as it is handed over — and the copy stays correct even if the set is
-- edited later. The copy is made on the server (Orders beforeChange hook).

CREATE TYPE "public"."enum_books_contents_section" AS ENUM('textbook', 'notebook', 'stationery');
CREATE TYPE "public"."enum_orders_items_parts_section" AS ENUM('textbook', 'notebook', 'stationery');

CREATE TABLE "books_contents" (
	"_order" integer NOT NULL,
	"_parent_id" uuid NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"section" "public"."enum_books_contents_section" NOT NULL,
	"subject" varchar,
	"name" varchar NOT NULL,
	"publisher" varchar,
	"detail" varchar,
	"quantity" numeric DEFAULT 1 NOT NULL,
	"starred" boolean DEFAULT false
);
ALTER TABLE "books_contents" ADD CONSTRAINT "books_contents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."books"("id") ON DELETE CASCADE;
CREATE INDEX "books_contents_order_idx" ON "books_contents" USING btree ("_order");
CREATE INDEX "books_contents_parent_id_idx" ON "books_contents" USING btree ("_parent_id");
ALTER TABLE "books_contents" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "orders_items_parts" (
	"_order" integer NOT NULL,
	"_parent_id" varchar NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"section" "public"."enum_orders_items_parts_section" NOT NULL,
	"subject" varchar,
	"name" varchar NOT NULL,
	"publisher" varchar,
	"detail" varchar,
	"quantity" numeric DEFAULT 1 NOT NULL,
	"starred" boolean DEFAULT false,
	"collected_at" timestamp(3) with time zone
);
ALTER TABLE "orders_items_parts" ADD CONSTRAINT "orders_items_parts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders_items"("id") ON DELETE CASCADE;
CREATE INDEX "orders_items_parts_order_idx" ON "orders_items_parts" USING btree ("_order");
CREATE INDEX "orders_items_parts_parent_id_idx" ON "orders_items_parts" USING btree ("_parent_id");
ALTER TABLE "orders_items_parts" ENABLE ROW LEVEL SECURITY;
