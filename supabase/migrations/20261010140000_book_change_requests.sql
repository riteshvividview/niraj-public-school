-- Book set lock + subject/language change requests.
--
-- Students can no longer switch their assigned second language / specialization
-- on Essentials -> Books; they raise a request instead, and staff approve or
-- reject it from the console. Approving applies the change to the student's
-- profile atomically (SQL function below).
--
-- Same security posture as 20261010120000_exchange_requests.sql: RLS on and no
-- anon/authenticated privileges, ON DELETE RESTRICT, CHECK constraints, a
-- partial unique index so a student can have only one pending request, and a
-- function that anon/authenticated cannot execute.

CREATE TYPE "public"."enum_book_change_requests_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE "public"."enum_book_change_requests_requested_second_language" AS ENUM('hindi', 'telugu');
CREATE TYPE "public"."enum_book_change_requests_requested_stream" AS ENUM('science', 'economics');
CREATE TYPE "public"."enum_book_change_requests_requested_elective" AS ENUM('ena', 'roboticsAI', 'homeScience');
CREATE TYPE "public"."enum_book_change_requests_current_second_language" AS ENUM('hindi', 'telugu');
CREATE TYPE "public"."enum_book_change_requests_current_stream" AS ENUM('science', 'economics');
CREATE TYPE "public"."enum_book_change_requests_current_elective" AS ENUM('ena', 'roboticsAI', 'homeScience');

CREATE TABLE "book_change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"requested_second_language" "public"."enum_book_change_requests_requested_second_language",
	"requested_stream" "public"."enum_book_change_requests_requested_stream",
	"requested_elective" "public"."enum_book_change_requests_requested_elective",
	"current_second_language" "public"."enum_book_change_requests_current_second_language",
	"current_stream" "public"."enum_book_change_requests_current_stream",
	"current_elective" "public"."enum_book_change_requests_current_elective",
	"reason" varchar NOT NULL,
	"status" "public"."enum_book_change_requests_status" DEFAULT 'pending' NOT NULL,
	"staff_note" varchar,
	"contact_note" varchar,
	"decided_by_id" uuid,
	"decided_by_name" varchar,
	"decided_at" timestamp(3) with time zone,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_change_requests_something_requested" CHECK (
		"requested_second_language" IS NOT NULL OR "requested_stream" IS NOT NULL OR "requested_elective" IS NOT NULL
	),
	CONSTRAINT "book_change_requests_reason_len" CHECK (char_length("reason") BETWEEN 3 AND 300),
	CONSTRAINT "book_change_requests_staff_note_len" CHECK ("staff_note" IS NULL OR char_length("staff_note") <= 500),
	CONSTRAINT "book_change_requests_contact_note_len" CHECK ("contact_note" IS NULL OR char_length("contact_note") <= 1000),
	CONSTRAINT "book_change_requests_decision_complete" CHECK (
		"status" NOT IN ('approved', 'rejected') OR "decided_at" IS NOT NULL
	)
);

ALTER TABLE "book_change_requests" ADD CONSTRAINT "book_change_requests_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "book_change_requests" ADD CONSTRAINT "book_change_requests_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "book_change_requests" ADD CONSTRAINT "book_change_requests_decided_by_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "public"."payload_admins"("id") ON DELETE set null ON UPDATE no action;

-- One pending request per student.
CREATE UNIQUE INDEX "book_change_requests_one_pending_per_user_idx" ON "book_change_requests" USING btree ("user_id") WHERE "status" = 'pending';
CREATE INDEX "book_change_requests_school_status_created_idx" ON "book_change_requests" USING btree ("school_id", "status", "created_at" DESC);
CREATE INDEX "book_change_requests_user_created_idx" ON "book_change_requests" USING btree ("user_id", "created_at" DESC);
CREATE INDEX "book_change_requests_updated_at_idx" ON "book_change_requests" USING btree ("updated_at");
CREATE INDEX "book_change_requests_created_at_idx" ON "book_change_requests" USING btree ("created_at");

ALTER TABLE "book_change_requests" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "book_change_requests" FROM anon, authenticated;

-- --- payload_locked_documents_rels: register the new collection ------------
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "book_change_requests_id" uuid;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_book_change_requests_fk" FOREIGN KEY ("book_change_requests_id") REFERENCES "public"."book_change_requests"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "payload_locked_documents_rels_book_change_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("book_change_requests_id");

-- --- approve_book_change_request ----------------------------------------------
-- Approves a PENDING request and applies it to the student's profile in one
-- transaction (request row locked first, so two staff can't both approve).
-- "Second language" is stored the way the roster import stores it:
-- academic_language = that language, language_level = 'second' — see
-- secondLanguageOf() in src/lib/academic-language.ts. Fields the student did
-- not ask to change are left as they are.
-- Raises: BOOKCHANGE_NOT_FOUND, BOOKCHANGE_BAD_STATUS:<status>.
CREATE OR REPLACE FUNCTION "public"."approve_book_change_request"(
	p_request_id uuid,
	p_admin_id uuid,
	p_admin_name text,
	p_staff_note text
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
	r book_change_requests%ROWTYPE;
BEGIN
	SELECT * INTO r FROM book_change_requests WHERE id = p_request_id FOR UPDATE;
	IF NOT FOUND THEN
		RAISE EXCEPTION 'BOOKCHANGE_NOT_FOUND';
	END IF;
	IF r.status <> 'pending' THEN
		RAISE EXCEPTION 'BOOKCHANGE_BAD_STATUS:%', r.status;
	END IF;

	UPDATE users SET
		academic_language = COALESCE(r.requested_second_language::text::enum_users_academic_language, academic_language),
		language_level = CASE WHEN r.requested_second_language IS NOT NULL THEN 'second'::enum_users_language_level ELSE language_level END,
		stream = COALESCE(r.requested_stream::text::enum_users_stream, stream),
		elective = COALESCE(r.requested_elective::text::enum_users_elective, elective),
		updated_at = now()
	WHERE id = r.user_id;

	UPDATE book_change_requests SET
		status = 'approved',
		staff_note = NULLIF(p_staff_note, ''),
		decided_by_id = p_admin_id,
		decided_by_name = p_admin_name,
		decided_at = now(),
		updated_at = now()
	WHERE id = r.id;

	RETURN jsonb_build_object('ok', true, 'userId', r.user_id);
END;
$$;

REVOKE ALL ON FUNCTION "public"."approve_book_change_request"(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
