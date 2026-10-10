"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n/context";
import { cn } from "@/lib/utils";
import type { ExchangeStatus } from "@/types";

const STYLES: Record<ExchangeStatus, string> = {
  pending: "bg-section-programs-bg text-section-programs",
  approved: "bg-section-workspace-bg text-section-workspace",
  rejected: "bg-section-pay-bg text-section-pay",
  cancelled: "bg-section-console-bg text-section-console",
  completed: "bg-section-essentials-bg text-section-essentials",
};

export function useExchangeStatusText() {
  const { t } = useTranslation();
  const p = t.exchangePage;
  return {
    label: {
      pending: p.statusPending,
      approved: p.statusApproved,
      rejected: p.statusRejected,
      cancelled: p.statusCancelled,
      completed: p.statusCompleted,
    } satisfies Record<ExchangeStatus, string>,
    help: {
      pending: p.helpPending,
      approved: p.helpApproved,
      rejected: p.helpRejected,
      cancelled: p.helpCancelled,
      completed: p.helpCompleted,
    } satisfies Record<ExchangeStatus, string>,
  };
}

export function ExchangeStatusBadge({ status, className }: { status: ExchangeStatus; className?: string }) {
  const { label } = useExchangeStatusText();
  return (
    <Badge variant="secondary" className={cn("border-transparent font-medium", STYLES[status], className)}>
      {label[status]}
    </Badge>
  );
}
