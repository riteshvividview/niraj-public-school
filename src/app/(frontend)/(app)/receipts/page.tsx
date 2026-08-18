"use client";

import { ChevronRight, Receipt as ReceiptIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, toBadgeStatus } from "@/components/shared/status-badge";
import { useTranslation } from "@/i18n/context";
import { deriveReceiptTitle } from "@/lib/cart-items";
import { getReceiptsByUser } from "@/lib/data-source";
import { formatCurrencyINR, formatDate, formatTime } from "@/lib/format";
import { useAuth } from "@/store/auth-store";
import type { ReceiptRecord } from "@/types";

function ReceiptRow({ record }: { record: ReceiptRecord }) {
  const { t, language } = useTranslation();
  const title = deriveReceiptTitle(record.order.items, {
    books: t.receiptsPage.titleBooks,
    uniform: t.receiptsPage.titleUniform,
    stationery: t.receiptsPage.titleStationery,
    receiptWord: t.receiptsPage.titleReceiptWord,
    programmeReceiptWord: t.receiptsPage.titleProgrammeReceiptWord,
  });
  return (
    <Link
      href={`/receipts/${record.receipt.id}`}
      className="mb-2.5 flex items-center gap-3 rounded-lg border border-line/60 bg-card p-4 transition-colors hover:bg-muted/50 last:mb-0"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{title}</p>
        <p className="text-sm text-sub">
          {formatDate(record.receipt.issuedAt, language)}, {formatTime(record.receipt.issuedAt, language)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="font-heading text-sm font-bold text-ink">
          {formatCurrencyINR(record.order.totalAmount, language)}
        </span>
        <StatusBadge status={toBadgeStatus(record.receipt.redemptionStatus)} />
      </div>
      <ChevronRight className="size-4 shrink-0 text-sub" />
    </Link>
  );
}

export default function ReceiptsListPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [records, setRecords] = useState<ReceiptRecord[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    getReceiptsByUser(profile.id).then(setRecords);
  }, [profile]);

  if (!profile) return null;

  return (
    <>
      <AppHeader title={t.receiptsPage.title} showAvatar />
      <div className="w-full p-4 pb-8 sm:p-6 lg:p-8">
        {records === null ? null : records.length === 0 ? (
          <EmptyState
            icon={ReceiptIcon}
            title={t.receiptsPage.emptyTitle}
            description={t.receiptsPage.emptyDescription}
          />
        ) : (
          records.map((record) => <ReceiptRow key={record.receipt.id} record={record} />)
        )}
      </div>
    </>
  );
}
