-- Subject changes become a LOG instead of a request/approval flow.
--
-- Students now choose their own second language / main group / secondary specialization on
-- Essentials -> Books (with a confirmation step), until they have paid for that class's books.
-- School staff can change them on the student's profile at any time. Every change is written
-- to book_change_requests with status 'applied', the class the student was in at that moment,
-- and who made it — the console's Subject Changes tab shows this as a read-only log.
--
-- Nothing is deleted. Old requests stay as they are; any request still pending is closed as
-- "cancelled" with a note, because there is no approval step any more.

ALTER TYPE "public"."enum_book_change_requests_status" ADD VALUE IF NOT EXISTS 'applied';

CREATE TYPE "public"."enum_book_change_requests_changed_by_type" AS ENUM('student', 'staff');

ALTER TABLE "book_change_requests"
	ADD COLUMN "class_level_id" uuid,
	ADD COLUMN "class_label" varchar,
	ADD COLUMN "changed_by_type" "public"."enum_book_change_requests_changed_by_type",
	ADD COLUMN "changed_by_name" varchar;

ALTER TABLE "book_change_requests" ADD CONSTRAINT "book_change_requests_class_level_id_fk" FOREIGN KEY ("class_level_id") REFERENCES "public"."class_levels"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "book_change_requests_class_level_idx" ON "book_change_requests" USING btree ("class_level_id");

UPDATE "book_change_requests"
   SET "status" = 'cancelled',
       "staff_note" = 'Closed automatically: students now choose their own subjects, no approval needed.',
       "updated_at" = now()
 WHERE "status" = 'pending';
