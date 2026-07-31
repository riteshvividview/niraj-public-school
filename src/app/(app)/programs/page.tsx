"use client";

import { Calendar } from "lucide-react";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "@/i18n/context";

/** Real Programs & Events feed is built in Phase 7. */
export default function ProgramsStubPage() {
  const { t } = useTranslation();
  return (
    <>
      <AppHeader title={t.nav.programs} />
      <div className="p-4">
        <EmptyState
          icon={Calendar}
          title={t.stub.comingSoonTitle}
          description={t.stub.comingSoonDescription}
        />
      </div>
    </>
  );
}
