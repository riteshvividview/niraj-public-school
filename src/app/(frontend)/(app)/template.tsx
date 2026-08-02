import type { ReactNode } from "react";

/**
 * Templates (unlike layout.tsx) remount on every navigation, which is what
 * gives each page its own fresh entrance animation on route change. Kept to
 * a quick, subtle fade+rise (200ms) so it reads as a page transition, not a
 * loading delay.
 */
export default function AppTemplate({ children }: { children: ReactNode }) {
  return <div className="animate-in fade-in slide-in-from-bottom-1 duration-200">{children}</div>;
}
