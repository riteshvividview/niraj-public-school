"use client";

import { ShoppingCart } from "lucide-react";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useTranslation } from "@/i18n/context";

/** Real cart/checkout flow (payment, receipts) is built in Phase 6. */
export default function CartStubPage() {
  const { t } = useTranslation();
  return (
    <>
      <AppHeader title={t.cart.title} backHref="/essentials" />
      <div className="p-4">
        <EmptyState
          icon={ShoppingCart}
          title={t.stub.comingSoonTitle}
          description={t.stub.comingSoonDescription}
        />
      </div>
    </>
  );
}
