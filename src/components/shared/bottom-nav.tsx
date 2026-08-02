"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface BottomNavTab {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function BottomNav({ tabs }: { tabs: BottomNavTab[] }) {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur md:hidden">
      <ul
        className="mx-auto grid max-w-lg"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="min-w-0">
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 px-0.5 py-2.5 text-[11px] font-medium transition-colors sm:text-xs",
                  isActive ? "text-brand" : "text-sub hover:text-ink",
                )}
              >
                <Icon className="size-5 shrink-0" strokeWidth={isActive ? 2.4 : 2} />
                <span className="w-full truncate text-center">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
