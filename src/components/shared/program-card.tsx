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
  venue?: string;
  fee: number;
  seatsAvailable?: number;
  status: ProgramStatus;
  /** The signed-in student already has a paid receipt for this program. */
  registered?: boolean;
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
  registered,
  href,
  className,
}: ProgramCardProps) {
  const { language, t } = useTranslation();

  const content = (
    <div
      className={cn(
        "rounded-xl border border-line/60 bg-card p-5 transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-md",
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h4 className="min-w-0 truncate font-heading text-base font-semibold text-ink">{title}</h4>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {registered ? (
            <span className="rounded-full bg-section-essentials-bg px-2.5 py-0.5 text-xs font-semibold text-section-essentials">
              {t.programsPage.registeredBadge}
            </span>
          ) : null}
          <StatusBadge status={toBadgeStatus(status)} />
        </div>
      </div>
      <div className="space-y-1.5 text-sm text-sub">
        <p className="flex items-center gap-1.5">
          <Calendar className="size-4 shrink-0" />
          {formatDate(date, language)}
        </p>
        {venue ? (
          <p className="flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0" />
            <span className="truncate">{venue}</span>
          </p>
        ) : null}
        {seatsAvailable !== undefined ? (
          <p className="flex items-center gap-1.5">
            <Users className="size-4 shrink-0" />
            {seatsAvailable} {t.common.seatsLeft}
          </p>
        ) : null}
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
