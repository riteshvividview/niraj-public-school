"use client";

import { Receipt } from "lucide-react";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "@/i18n/context";

/** Real My Receipts history is built in Phase 6. */
export default function ReceiptsStubPage() {
  const { t } = useTranslation();
  return (
    <>
      <AppHeader title={t.nav.receipts} />
      <div className="p-4">
        <EmptyState
          icon={Receipt}
          title={t.stub.comingSoonTitle}
          description={t.stub.comingSoonDescription}
        />
      </div>
    </>
  );
}
