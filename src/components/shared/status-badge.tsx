"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n/context";
import type { Dictionary } from "@/i18n/types";
import { cn } from "@/lib/utils";

export type BadgeStatus = keyof Dictionary["status"];

const STATUS_STYLES: Record<BadgeStatus, string> = {
  open: "bg-section-essentials-bg text-section-essentials",
  fillingFast: "bg-section-programs-bg text-section-programs",
  full: "bg-section-pay-bg text-section-pay",
  closed: "bg-section-console-bg text-section-console",
  paid: "bg-section-essentials-bg text-section-essentials",
  pending: "bg-section-programs-bg text-section-programs",
  failed: "bg-section-pay-bg text-section-pay",
  refunded: "bg-section-console-bg text-section-console",
  ready: "bg-section-workspace-bg text-section-workspace",
  collected: "bg-section-essentials-bg text-section-essentials",
  checkedIn: "bg-section-essentials-bg text-section-essentials",
  cancelled: "bg-section-pay-bg text-section-pay",
};

/**
 * Converts a domain status value (e.g. Program/Order/Receipt status, which
 * use kebab-case like "filling-fast") into the camelCase key used by the
 * Dictionary and this component. Add new statuses to Dictionary["status"]
 * (all three languages) — no change needed here.
 */
export function toBadgeStatus(domainStatus: string): BadgeStatus {
  return domainStatus.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()) as BadgeStatus;
}

export function StatusBadge({
  status,
  className,
}: {
  status: BadgeStatus;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <Badge
      variant="outline"
      className={cn("border-transparent font-semibold", STATUS_STYLES[status], className)}
    >
      {t.status[status]}
    </Badge>
  );
}
