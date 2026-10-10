import { Calendar, Home, LifeBuoy, Receipt, Repeat, ShoppingBag, User, type LucideIcon } from "lucide-react";
import type { Dictionary } from "@/i18n/types";

export interface AppNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Shared between AppBottomNav (mobile) and AppSidebar (desktop) — same tabs, two layouts. */
export function getAppNavItems(t: Dictionary): AppNavItem[] {
  return [
    { href: "/home", label: t.nav.home, icon: Home },
    { href: "/essentials", label: t.nav.essentials, icon: ShoppingBag },
    { href: "/programs", label: t.nav.programs, icon: Calendar },
    { href: "/receipts", label: t.nav.receipts, icon: Receipt },
    { href: "/exchange", label: t.nav.exchange, icon: Repeat },
    { href: "/support", label: t.nav.support, icon: LifeBuoy },
    { href: "/profile", label: t.nav.profile, icon: User },
  ];
}
