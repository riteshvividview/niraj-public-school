import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export interface AppHeaderProps {
  title: string;
  /** Route to go back to. Omit to hide the back button (e.g. on root tabs). */
  backHref?: string;
  /** Slot for a trailing action — profile icon, help icon, language switcher, etc. */
  right?: ReactNode;
}

export function AppHeader({ title, backHref, right }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-line bg-card/90 px-4 py-3 backdrop-blur">
      {backHref ? (
        <Link
          href={backHref}
          aria-label="Back"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-muted"
        >
          <ChevronLeft className="size-5" />
        </Link>
      ) : null}
      <h1 className="flex-1 truncate font-heading text-lg font-semibold text-ink">{title}</h1>
      {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
    </header>
  );
}
