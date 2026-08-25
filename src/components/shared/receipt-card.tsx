"use client";

import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { StatusBadge, type BadgeStatus } from "@/components/shared/status-badge";
import { useTranslation } from "@/i18n/context";
import { formatCurrencyINR, formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/types";

export interface ReceiptCardProps {
  /** Derived from what's actually in the order, e.g. "Books & Uniform Receipt" — see deriveReceiptTitle. */
  title: string;
  schoolName: string;
  /**
   * Every purchased line, shown itemized (name, meta, quantity, price).
   * Once persisted, order lines also carry `collectedAt` (null until
   * marked collected at the counter) — shown as a small per-item
   * collected/pending tag for non-program items when present, so a parent
   * can see exactly what's already been picked up.
   */
  items: (CartItem & { collectedAt?: string | null })[];
  amount: number;
  date: string;
  /** Encoded into the QR code and shown as readable text — the receipt's short human code (see qrPayload). */
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
  title,
  schoolName,
  items,
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
        <div className="min-w-0">
          <p className="truncate font-heading text-base font-semibold text-ink">{title}</p>
          <p className="text-xs text-sub">{schoolName}</p>
          <p className="mt-1 text-sm text-sub">
            {formatDate(date, language)} · {formatTime(date, language)}
          </p>
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

      <div className="flex flex-col items-center gap-3 border-b border-dashed border-line p-6">
        <div className="rounded-xl border border-line bg-white p-3">
          <QRCodeSVG value={qrValue} size={144} />
        </div>
        <div className="text-center">
          <p className="text-xs text-sub">{t.receiptsPage.receiptCodeLabel}</p>
          <p className="font-mono text-lg font-semibold tracking-widest text-ink">{qrValue}</p>
        </div>
        <p className="text-center text-xs text-sub">
          {isTicket ? t.common.showAtEntry : t.common.showAtCounter}
        </p>
      </div>

      <div className="space-y-3 p-5">
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="text-ink">{item.label}</p>
                {item.meta ? <p className="text-xs text-sub">{item.meta}</p> : null}
                {item.quantity > 1 ? (
                  <p className="text-xs text-sub">
                    {item.quantity} × {formatCurrencyINR(item.unitPrice, language)}
                  </p>
                ) : null}
                {item.kind !== "program" && item.collectedAt !== undefined ? (
                  <p className={cn("text-xs font-medium", item.collectedAt ? "text-section-essentials" : "text-sub")}>
                    {item.collectedAt ? t.common.collected : t.common.pendingCollection}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 font-medium text-ink">
                {formatCurrencyINR(item.unitPrice * item.quantity, language)}
              </span>
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
