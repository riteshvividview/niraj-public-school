import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionAccent =
  | "workspace"
  | "essentials"
  | "programs"
  | "pay"
  | "console"
  | "platform";

const ACCENT_CLASSES: Record<SectionAccent, string> = {
  workspace: "bg-section-workspace-bg text-section-workspace",
  essentials: "bg-section-essentials-bg text-section-essentials",
  programs: "bg-section-programs-bg text-section-programs",
  pay: "bg-section-pay-bg text-section-pay",
  console: "bg-section-console-bg text-section-console",
  platform: "bg-section-platform-bg text-section-platform",
};

export interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  items?: string[];
  accent: SectionAccent;
  className?: string;
}

/**
 * The "icon + title + bullet list" card pattern from plan.html's feature
 * grid — reused for feature summaries, program/catalogue summaries, etc.
 */
export function SectionCard({ icon: Icon, title, description, items, accent, className }: SectionCardProps) {
  return (
    <div className={cn("rounded-2xl border border-line bg-card p-6", className)}>
      <div className={cn("mb-4 flex size-11 items-center justify-center rounded-xl", ACCENT_CLASSES[accent])}>
        <Icon className="size-5" />
      </div>
      <h4 className="mb-1.5 font-heading text-base font-semibold text-ink">{title}</h4>
      {description ? <p className="text-sm text-sub">{description}</p> : null}
      {items && items.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {items.map((item) => (
            <li key={item} className="relative pl-4 text-sm text-sub">
              <span className="absolute left-0 top-2 size-1.5 rounded-full bg-line" />
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
