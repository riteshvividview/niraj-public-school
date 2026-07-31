"use client";

import { Calendar, Home, Receipt, ShoppingBag, User } from "lucide-react";
import { BottomNav, type BottomNavTab } from "@/components/shared/bottom-nav";
import { useTranslation } from "@/i18n/context";

export function AppBottomNav() {
  const { t } = useTranslation();

  const tabs: BottomNavTab[] = [
    { href: "/home", label: t.nav.home, icon: Home },
    { href: "/essentials", label: t.nav.essentials, icon: ShoppingBag },
    { href: "/programs", label: t.nav.programs, icon: Calendar },
    { href: "/receipts", label: t.nav.receipts, icon: Receipt },
    { href: "/profile", label: t.nav.profile, icon: User },
  ];

  return <BottomNav tabs={tabs} />;
}
