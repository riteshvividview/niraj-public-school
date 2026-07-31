"use client";

import { ShoppingBag } from "lucide-react";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "@/i18n/context";

/** Real Essentials hub (Books / Uniform & Kit / Stationery) is built in Phase 5. */
export default function EssentialsStubPage() {
  const { t } = useTranslation();
  return (
    <>
      <AppHeader title={t.nav.essentials} />
      <div className="p-4">
        <EmptyState
          icon={ShoppingBag}
          title={t.stub.comingSoonTitle}
          description={t.stub.comingSoonDescription}
        />
      </div>
    </>
  );
}
