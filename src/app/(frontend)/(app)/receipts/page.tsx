"use client";

import { ChevronRight, Receipt as ReceiptIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, toBadgeStatus } from "@/components/shared/status-badge";
import { useTranslation } from "@/i18n/context";
import { getSchoolById } from "@/lib/data-source";
import { formatCurrencyINR, formatDate } from "@/lib/format";
import { useAuth } from "@/store/auth-store";
import { useReceipts, type ReceiptRecord } from "@/store/receipts-store";
import type { School } from "@/types";

function ReceiptRow({ record, schoolName }: { record: ReceiptRecord; schoolName: string }) {
  const { language } = useTranslation();
  return (
    <Link
      href={`/receipts/${record.receipt.id}`}
      className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{schoolName}</p>
        <p className="text-sm text-sub">{formatDate(record.receipt.issuedAt, language)}</p>
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
  const receipts = useReceipts();
  const [school, setSchool] = useState<School | null>(null);

  useEffect(() => {
    if (!profile) return;
    getSchoolById(profile.schoolId).then(setSchool);
  }, [profile]);

  if (!profile) return null;

  const records = receipts.getForUser(profile.id);

  return (
    <>
      <AppHeader title={t.receiptsPage.title} />
      <div className="mx-auto w-full max-w-2xl space-y-3 p-4 pb-8 sm:p-6 lg:p-8">
        {records.length === 0 ? (
          <EmptyState
            icon={ReceiptIcon}
            title={t.receiptsPage.emptyTitle}
            description={t.receiptsPage.emptyDescription}
          />
        ) : (
          records.map((record) => (
            <ReceiptRow key={record.receipt.id} record={record} schoolName={school?.name ?? ""} />
          ))
        )}
      </div>
    </>
  );
}
