"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";
import { getAppNavItems } from "./nav-items";

/** Desktop only (md+) — see AppBottomNav for the mobile equivalent. */
export function AppSidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { profile, logout } = useAuth();
  const items = getAppNavItems(t);

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-card md:flex">
      <div className="border-b border-line p-5">
        <p className="font-heading text-sm font-bold text-ink">Niraj Public School</p>
        <p className="text-xs text-sub">Parent Portal</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-section-workspace-bg text-brand" : "text-sub hover:bg-muted hover:text-ink",
              )}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={isActive ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-4">
        <p className="truncate text-sm font-medium text-ink">{profile?.name}</p>
        <p className="truncate text-xs text-sub">{profile?.email}</p>
        <button
          type="button"
          onClick={logout}
          className="mt-2 flex items-center gap-2 text-sm font-medium text-section-pay"
        >
          <LogOut className="size-4" />
          {t.profile.logout}
        </button>
      </div>
    </aside>
  );
}
