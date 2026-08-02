"use client";

import { BookMarked, CalendarClock, LayoutDashboard, LogOut, ScanLine, Table2, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";
import { useConsoleAuth } from "@/store/console-auth-store";

const NAV_ITEMS = [
  { href: "/console/catalogue", label: "Catalogue Manager", icon: BookMarked },
  { href: "/console/programs", label: "Program Manager", icon: CalendarClock },
  { href: "/console/students", label: "Students", icon: Users },
  { href: "/console/timetable", label: "Timetable Manager", icon: Table2 },
  { href: "/console/scan", label: "Receipt / QR Scanner", icon: ScanLine },
  { href: "/console/reports", label: "Reports Dashboard", icon: LayoutDashboard },
];

function NavLinks({ direction = "vertical" }: { direction?: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  return (
    <nav className={cn("flex gap-1", direction === "vertical" ? "flex-col" : "flex-row")}>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              isActive ? "bg-section-console text-white" : "text-sub hover:bg-muted hover:text-ink",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
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
          <p className="font-heading text-sm font-bold text-ink">School Workspace</p>
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
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="font-heading text-sm font-bold text-ink">School Workspace — Console</p>
        </div>
        <div className="flex items-center gap-1">
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
