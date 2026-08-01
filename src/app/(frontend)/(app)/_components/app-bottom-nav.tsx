"use client";

import { BottomNav } from "@/components/shared/bottom-nav";
import { useTranslation } from "@/i18n/context";
import { getAppNavItems } from "./nav-items";

/** Mobile only — see AppSidebar for the md+ equivalent. */
export function AppBottomNav() {
  const { t } = useTranslation();
  return <BottomNav tabs={getAppNavItems(t)} />;
}
