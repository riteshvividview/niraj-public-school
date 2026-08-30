"use client";

import { ChevronLeft, ChevronRight, Receipt as ReceiptIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR, { preload } from "swr";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, toBadgeStatus } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/context";
import { deriveReceiptTitle } from "@/lib/cart-items";
import { getReceiptsPageByUser } from "@/lib/data-source";
import { formatCurrencyINR, formatDate, formatTime } from "@/lib/format";
import { useAuth } from "@/store/auth-store";
import type { ReceiptRecord } from "@/types";

const PAGE_SIZE = 20;

function ReceiptRow({ record }: { record: ReceiptRecord }) {
  const { t, language } = useTranslation();
  const title = deriveReceiptTitle(record.order.items, {
    books: t.receiptsPage.titleBooks,
    uniform: t.receiptsPage.titleUniform,
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
  const [page, setPage] = useState(1);

  const { data: pageData } = useSWR(
    profile ? ["receipts", profile.id, page] : null,
    () => getReceiptsPageByUser(profile!.id, page, PAGE_SIZE),
    { keepPreviousData: true },
  );
  const records = pageData?.records ?? null;
  const totalPages = pageData?.totalPages ?? 1;

  // Warm the next page in the background — same prefetch pattern the
  // console's Students/Payments pages use.
  if (profile && pageData && page < pageData.totalPages) {
    const nextPage = page + 1;
    void preload(["receipts", profile.id, nextPage], () => getReceiptsPageByUser(profile.id, nextPage, PAGE_SIZE));
  }

  if (!profile) return null;

  return (
    <>
      <AppHeader title={t.receiptsPage.title} showAvatar />
      <div className="w-full space-y-4 p-4 pb-8 sm:p-6 lg:p-8">
        {records === null ? null : records.length === 0 ? (
          <EmptyState
            icon={ReceiptIcon}
            title={t.receiptsPage.emptyTitle}
            description={t.receiptsPage.emptyDescription}
          />
        ) : (
          <>
            <div>
              {records.map((record) => (
                <ReceiptRow key={record.receipt.id} record={record} />
              ))}
            </div>
            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-3 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                  {t.common.previous}
                </Button>
                <p className="text-xs text-sub">
                  {t.common.pageOf} {page} / {totalPages}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t.common.next}
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
