ALTER TABLE "media" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "media" CASCADE;
  ALTER TABLE "users" DROP CONSTRAINT "users_avatar_id_media_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_media_fk";
  
  DROP INDEX "users_avatar_idx";
  DROP INDEX "payload_locked_documents_rels_media_id_idx";
  ALTER TABLE "users" DROP COLUMN "avatar_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "media_id";
