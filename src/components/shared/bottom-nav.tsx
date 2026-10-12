"use client";

import { MoreHorizontal, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface BottomNavTab {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** How many tabs fit comfortably on a phone before the rest move into "More" (labels truncated at 7). */
const MAX_VISIBLE = 5;

/**
 * Phone bottom bar. Up to 5 tabs show directly; with more, the first four stay and the rest open from
 * a "More" tab (it lights up when you're on one of them) — so labels never get squeezed into "Exchan…".
 */
export function BottomNav({ tabs, moreLabel = "More" }: { tabs: BottomNavTab[]; moreLabel?: string }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const overflow = tabs.length > MAX_VISIBLE;
  const visible = overflow ? tabs.slice(0, MAX_VISIBLE - 1) : tabs;
  const hidden = overflow ? tabs.slice(MAX_VISIBLE - 1) : [];
  const isOn = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const moreActive = hidden.some((tab) => isOn(tab.href));
  const columns = visible.length + (overflow ? 1 : 0);

  const tabClass = (active: boolean) =>
    cn(
      "flex min-w-0 w-full flex-col items-center gap-1 px-0.5 py-2.5 text-[11px] font-medium transition-colors sm:text-xs",
      active ? "text-brand" : "text-sub hover:text-ink",
    );

  return (
    <nav className="sticky bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {visible.map((tab) => {
          const active = isOn(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="min-w-0">
              <Link href={tab.href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
                <Icon className="size-5 shrink-0" strokeWidth={active ? 2.4 : 2} />
                <span className="w-full truncate text-center">{tab.label}</span>
              </Link>
            </li>
          );
        })}
        {overflow ? (
          <li className="min-w-0">
            <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" className={tabClass(moreActive)}>
              <MoreHorizontal className="size-5 shrink-0" strokeWidth={moreActive ? 2.4 : 2} />
              <span className="w-full truncate text-center">{moreLabel}</span>
            </button>
          </li>
        ) : null}
      </ul>

      {overflow ? (
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
            <SheetHeader>
              <SheetTitle>{moreLabel}</SheetTitle>
            </SheetHeader>
            <ul className="space-y-1 px-4 pb-2">
              {hidden.map((tab) => {
                const active = isOn(tab.href);
                const Icon = tab.icon;
                return (
                  <li key={tab.href}>
                    <Link
                      href={tab.href}
                      onClick={() => setMoreOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3.5 text-base font-medium transition-colors",
                        active ? "bg-section-workspace-bg text-brand" : "text-ink hover:bg-muted",
                      )}
                    >
                      <Icon className="size-5 shrink-0" />
                      {tab.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </SheetContent>
        </Sheet>
      ) : null}
    </nav>
  );
}
