"use client";

import {
  BookMarked,
  CalendarClock,
  Headset,
  History,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  Receipt,
  ScanLine,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useConsoleSchoolId, useEssentialsStock, useOpenSupportCount, usePendingBookChangeCount, usePendingExchangeCount, usePendingExtraItemCount, useConsoleOverview } from "@/lib/hooks/console-data";
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
  { href: "/console/requests", label: "Requests", icon: Inbox },
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
  onNavigate,
}: {
  direction?: "vertical" | "horizontal";
  /** Called when a link is chosen — lets the phone menu close itself. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const lowStockCount = useLowStockCount();
  const consoleSchoolId = useConsoleSchoolId();
  const pendingExchanges = usePendingExchangeCount(consoleSchoolId);
  const pendingBookChanges = usePendingBookChangeCount(consoleSchoolId);
  const pendingExtraItems = usePendingExtraItemCount(consoleSchoolId);
  const { data: overview } = useConsoleOverview(consoleSchoolId);
  const openSupport = useOpenSupportCount(consoleSchoolId);
  const navItems = useNavItems();
  const badgeCounts: Record<string, number> = {
    "/console/stock": lowStockCount,
    // Exchanges, extra items, subject changes and payment attempts share one tab — its badge is everything waiting.
    "/console/requests": pendingExchanges + pendingBookChanges + pendingExtraItems + (overview?.paymentsNeedingReview ?? 0),
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
            onClick={onNavigate}
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
  const { staff, logout } = useConsoleAuth();
  const pathname = usePathname();
  const navItems = useNavItems();
  const [open, setOpen] = useState(false);
  const current = navItems.find(({ href }) => pathname === href || pathname.startsWith(`${href}/`));

  return (
    <div className="sticky top-0 z-40 border-b border-line bg-card/95 backdrop-blur md:hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu" className="shrink-0">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 max-w-[85vw] flex-col gap-0 p-0">
            <SheetHeader className="border-b border-line p-5 text-left">
              <SheetTitle className="font-heading text-sm font-bold text-ink">School Workspace</SheetTitle>
              <p className="text-xs text-sub">Staff Console</p>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <NavLinks onNavigate={() => setOpen(false)} />
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
          </SheetContent>
        </Sheet>
        <p className="min-w-0 flex-1 truncate font-heading text-sm font-bold text-ink">{current?.label ?? "School Workspace"}</p>
        <ThemeToggle />
      </div>
    </div>
  );
}
