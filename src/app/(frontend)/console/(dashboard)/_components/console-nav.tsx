"use client";

import {
  BookMarked,
  BookOpenCheck,
  CalendarClock,
  Headset,
  History,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  Receipt,
  Repeat,
  ScanLine,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useConsoleSchoolId, useEssentialsStock, useOpenSupportCount, usePendingBookChangeCount, usePendingExchangeCount } from "@/lib/hooks/console-data";
import { cn } from "@/lib/utils";
import { useConsoleAuth } from "@/store/console-auth-store";

/** Administration is only ever shown to administrators — staff accounts can't invite/manage other accounts. */
function useNavItems() {
  const { staff } = useConsoleAuth();
  return staff?.role === "administrator" ? [...NAV_ITEMS, ADMINISTRATOR_ONLY_ITEM] : NAV_ITEMS;
}

const NAV_ITEMS = [
  { href: "/console/catalogue", label: "Catalogue Manager", icon: BookMarked },
  { href: "/console/stock", label: "Essentials Stock", icon: PackageSearch },
  { href: "/console/programs", label: "Program Manager", icon: CalendarClock },
  { href: "/console/students", label: "Students", icon: Users },
  { href: "/console/scan", label: "Receipt / QR Scanner", icon: ScanLine },
  { href: "/console/payments", label: "Payments", icon: Receipt },
  { href: "/console/exchange-requests", label: "Exchange Requests", icon: Repeat },
  { href: "/console/subject-change-requests", label: "Subject Change Requests", icon: BookOpenCheck },
  { href: "/console/support", label: "Parent Support", icon: Headset },
  { href: "/console/records", label: "Records & History", icon: History },
  {
    href: "/console/reports",
    label: "Reports Dashboard",
    icon: LayoutDashboard,
  },
];

const ADMINISTRATOR_ONLY_ITEM = {
  href: "/console/administration",
  label: "Administration",
  icon: ShieldCheck,
};

/** Count of essentials-stock rows at/under their low-stock threshold — shown as a badge on the Essentials Stock nav item, per the school's "notify in the CMS, not by email" request. */
function useLowStockCount(): number {
  const schoolId = useConsoleSchoolId();
  const { stockRows } = useEssentialsStock(schoolId);
  if (!stockRows) return 0;
  return stockRows.filter((row) => row.quantityOnHand <= row.lowStockThreshold).length;
}

function NavLinks({
  direction = "vertical",
}: {
  direction?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
  const lowStockCount = useLowStockCount();
  const consoleSchoolId = useConsoleSchoolId();
  const pendingExchanges = usePendingExchangeCount(consoleSchoolId);
  const pendingBookChanges = usePendingBookChangeCount(consoleSchoolId);
  const openSupport = useOpenSupportCount(consoleSchoolId);
  const navItems = useNavItems();
  const badgeCounts: Record<string, number> = {
    "/console/stock": lowStockCount,
    "/console/exchange-requests": pendingExchanges,
    "/console/subject-change-requests": pendingBookChanges,
    "/console/support": openSupport,
  };
  return (
    <nav
      className={cn(
        "flex gap-1",
        direction === "vertical" ? "flex-col" : "flex-row",
      )}
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        const badgeCount = badgeCounts[href] ?? 0;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-section-console text-white"
                : "text-sub hover:bg-muted hover:text-ink",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
            {badgeCount > 0 ? (
              <span className="ml-auto flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {badgeCount > 9 ? "9+" : badgeCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function ConsoleSidebar() {
  const { staff, logout } = useConsoleAuth();
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-card md:flex">
      <div className="flex items-center justify-between border-b border-line p-5">
        <div>
          <p className="font-heading text-sm font-bold text-ink">
            School Workspace
          </p>
          <p className="text-xs text-sub">Staff Console</p>
        </div>
        <ThemeToggle />
      </div>
      <div className="flex-1 p-4">
        <NavLinks />
      </div>
      <div className="border-t border-line p-4">
        <p className="truncate text-xs text-sub">{staff?.name}</p>
        <p className="truncate text-xs text-sub">{staff?.email}</p>
        <button
          type="button"
          onClick={logout}
          className="mt-2 flex cursor-pointer items-center gap-2 rounded-md text-sm font-medium text-section-pay transition-colors hover:text-section-pay/80"
        >
          <LogOut className="size-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}

export function ConsoleMobileNav() {
  const { logout } = useConsoleAuth();
  return (
    <div className="border-b border-line bg-card md:hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <p className="min-w-0 truncate font-heading text-sm font-bold text-ink">
          School Workspace
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={logout}
            className="cursor-pointer text-sm font-medium text-section-pay transition-colors hover:text-section-pay/80"
          >
            Log out
          </button>
        </div>
      </div>
      <div className="overflow-x-auto px-3 pb-3">
        <NavLinks direction="horizontal" />
      </div>
    </div>
  );
}
