-- Parent Support: a parent/student types a query on the Support tab, it lands in
-- the console's "Parent Support" tab, and staff contact the family directly
-- (email / phone / WhatsApp). Not a chat — one message in, staff reach out.
--
-- Same security posture as the exchange / book-change tables: RLS on, no
-- anon/authenticated privileges, ON DELETE RESTRICT (a family's history is
-- never silently orphaned), CHECK constraints, covering indexes.

CREATE TYPE "public"."enum_support_requests_status" AS ENUM('open', 'in-progress', 'resolved');

CREATE TABLE "support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"message" varchar NOT NULL,
	"contact_phone" varchar,
	"contact_email" varchar,
	"status" "public"."enum_support_requests_status" DEFAULT 'open' NOT NULL,
	"staff_note" varchar,
	"contact_note" varchar,
	"handled_by_id" uuid,
	"handled_by_name" varchar,
	"handled_at" timestamp(3) with time zone,
	"resolved_at" timestamp(3) with time zone,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_requests_message_len" CHECK (char_length("message") BETWEEN 5 AND 1000),
	CONSTRAINT "support_requests_contact_phone_len" CHECK ("contact_phone" IS NULL OR char_length("contact_phone") <= 20),
	CONSTRAINT "support_requests_contact_email_len" CHECK ("contact_email" IS NULL OR char_length("contact_email") <= 200),
	CONSTRAINT "support_requests_staff_note_len" CHECK ("staff_note" IS NULL OR char_length("staff_note") <= 500),
	CONSTRAINT "support_requests_contact_note_len" CHECK ("contact_note" IS NULL OR char_length("contact_note") <= 1000),
	CONSTRAINT "support_requests_resolved_has_time" CHECK ("status" <> 'resolved' OR "resolved_at" IS NOT NULL)
);

ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_handled_by_id_fk" FOREIGN KEY ("handled_by_id") REFERENCES "public"."payload_admins"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX "support_requests_school_status_created_idx" ON "support_requests" USING btree ("school_id", "status", "created_at" DESC);
CREATE INDEX "support_requests_user_created_idx" ON "support_requests" USING btree ("user_id", "created_at" DESC);
CREATE INDEX "support_requests_updated_at_idx" ON "support_requests" USING btree ("updated_at");
CREATE INDEX "support_requests_created_at_idx" ON "support_requests" USING btree ("created_at");

ALTER TABLE "support_requests" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "support_requests" FROM anon, authenticated;

-- --- payload_locked_documents_rels: register the new collection ------------
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "support_requests_id" uuid;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_support_requests_fk" FOREIGN KEY ("support_requests_id") REFERENCES "public"."support_requests"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "payload_locked_documents_rels_support_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("support_requests_id");
