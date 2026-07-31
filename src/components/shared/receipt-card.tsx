"use client";

import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { StatusBadge, type BadgeStatus } from "@/components/shared/status-badge";
import { useTranslation } from "@/i18n/context";
import { formatCurrencyINR, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ReceiptCardProps {
  schoolName: string;
  /** Item/program summary lines, e.g. "Grade 6 Book Set", "Uniform (Size 32)". */
  summaryLines: string[];
  amount: number;
  date: string;
  /** Encoded into the QR code — the receipt id is enough for this mock phase. */
  qrValue: string;
  status: BadgeStatus;
  /**
   * "ticket" is for program/event orders — shows venue prominently, labels
   * itself "Ticket", and swaps the QR helper text to an entry/check-in
   * phrasing instead of "collect at the counter". Defaults to "receipt".
   */
  variant?: "receipt" | "ticket";
  /** Only meaningful for the "ticket" variant. */
  venue?: string;
  /** Wired to real behaviour in Phase 6 — omit to hide the action. */
  onDownload?: () => void;
  onShare?: () => void;
  className?: string;
}

export function ReceiptCard({
  schoolName,
  summaryLines,
  amount,
  date,
  qrValue,
  status,
  variant = "receipt",
  venue,
  onDownload,
  onShare,
  className,
}: ReceiptCardProps) {
  const { language, t } = useTranslation();
  const isTicket = variant === "ticket";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-line bg-card",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 bg-section-workspace-bg p-5">
        <div>
          <p className="font-heading text-base font-semibold text-ink">{schoolName}</p>
          <p className="text-sm text-sub">{formatDate(date, language)}</p>
          {isTicket && venue ? <p className="text-sm font-medium text-ink">{venue}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {isTicket ? (
            <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-white">
              {t.common.ticketLabel}
            </span>
          ) : null}
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 border-b border-dashed border-line p-6">
        <div className="rounded-xl border border-line bg-white p-3">
          <QRCodeSVG value={qrValue} size={144} />
        </div>
        <p className="text-center text-xs text-sub">
          {isTicket ? t.common.showAtEntry : t.common.showAtCounter}
        </p>
      </div>

      <div className="space-y-2 p-5">
        <ul className="space-y-1">
          {summaryLines.map((line) => (
            <li key={line} className="text-sm text-ink">
              {line}
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-line pt-3">
          <span className="text-sm text-sub">{t.common.total}</span>
          <span className="font-heading text-lg font-bold text-ink">{formatCurrencyINR(amount, language)}</span>
        </div>
      </div>

      {(onDownload || onShare) && (
        <div className="flex gap-2 border-t border-line p-4" data-html2canvas-ignore="true">
          {onDownload ? (
            <Button variant="outline" className="flex-1" onClick={onDownload}>
              {t.common.download}
            </Button>
          ) : null}
          {onShare ? (
            <Button variant="outline" className="flex-1" onClick={onShare}>
              {t.common.share}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
