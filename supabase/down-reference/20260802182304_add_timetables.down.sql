ALTER TABLE "timetables_periods" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "timetables_notes" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "timetables" DISABLE ROW LEVEL SECURITY;
DROP TABLE "timetables_periods" CASCADE;
DROP TABLE "timetables_notes" CASCADE;
DROP TABLE "timetables" CASCADE;
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_timetables_fk";

DROP INDEX "payload_locked_documents_rels_timetables_id_idx";
ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "timetables_id";
