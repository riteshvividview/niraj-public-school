"use client";

import { Calendar, MapPin, Users } from "lucide-react";
import Link from "next/link";
import type { ProgramStatus } from "@/types";
import { StatusBadge, toBadgeStatus } from "@/components/shared/status-badge";
import { useTranslation } from "@/i18n/context";
import { formatCurrencyINR, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ProgramCardProps {
  title: string;
  date: string;
  venue: string;
  fee: number;
  seatsAvailable: number;
  status: ProgramStatus;
  href?: string;
  className?: string;
}

export function ProgramCard({
  title,
  date,
  venue,
  fee,
  seatsAvailable,
  status,
  href,
  className,
}: ProgramCardProps) {
  const { language, t } = useTranslation();

  const content = (
    <div className={cn("rounded-2xl border border-line bg-card p-5 transition-shadow hover:shadow-md", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h4 className="min-w-0 truncate font-heading text-base font-semibold text-ink">{title}</h4>
        <StatusBadge status={toBadgeStatus(status)} />
      </div>
      <div className="space-y-1.5 text-sm text-sub">
        <p className="flex items-center gap-1.5">
          <Calendar className="size-4 shrink-0" />
          {formatDate(date, language)}
        </p>
        <p className="flex items-center gap-1.5">
          <MapPin className="size-4 shrink-0" />
          <span className="truncate">{venue}</span>
        </p>
        <p className="flex items-center gap-1.5">
          <Users className="size-4 shrink-0" />
          {seatsAvailable} {t.common.seatsLeft}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="font-heading text-lg font-bold text-ink">{formatCurrencyINR(fee, language)}</span>
        <span className="text-sm font-semibold text-brand">{t.common.viewDetails}</span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
