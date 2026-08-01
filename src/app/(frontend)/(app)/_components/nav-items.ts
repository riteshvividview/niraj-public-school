import { Calendar, Home, Receipt, ShoppingBag, User, type LucideIcon } from "lucide-react";
import type { Dictionary } from "@/i18n/types";

export interface AppNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Shared between AppBottomNav (mobile) and AppSidebar (desktop) — same 5 tabs, two layouts. */
export function getAppNavItems(t: Dictionary): AppNavItem[] {
  return [
    { href: "/home", label: t.nav.home, icon: Home },
    { href: "/essentials", label: t.nav.essentials, icon: ShoppingBag },
    { href: "/programs", label: t.nav.programs, icon: Calendar },
    { href: "/receipts", label: t.nav.receipts, icon: Receipt },
    { href: "/profile", label: t.nav.profile, icon: User },
  ];
}
