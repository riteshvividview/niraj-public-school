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
    <nav className="sticky bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                  isActive ? "text-brand" : "text-sub hover:text-ink",
                )}
              >
                <Icon className="size-5" strokeWidth={isActive ? 2.4 : 2} />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
