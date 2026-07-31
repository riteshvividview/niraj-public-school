"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  /** Provide one of onAction / actionHref, not both. */
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line p-10 text-center", className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-sub">
        <Icon className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="font-heading text-base font-semibold text-ink">{title}</p>
        {description ? <p className="max-w-xs text-sm text-sub">{description}</p> : null}
      </div>
      {actionLabel && actionHref ? (
        <Button asChild size="sm" className="mt-1">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
      {actionLabel && onAction ? (
        <Button size="sm" className="mt-1" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
