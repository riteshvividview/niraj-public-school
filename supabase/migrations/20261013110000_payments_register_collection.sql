-- Payload tracks open documents per collection in payload_locked_documents_rels;
-- every collection needs its own column there (same as the other request collections).
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payments_id" uuid;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payments_fk" FOREIGN KEY ("payments_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "payload_locked_documents_rels_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("payments_id");
