"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import useSWR from "swr";
import { AppHeader } from "@/components/shared/app-header";
import { ReceiptCardSkeleton } from "@/components/shared/loading-skeletons";
import { ReceiptCard } from "@/components/shared/receipt-card";
import { toBadgeStatus } from "@/components/shared/status-badge";
import { useTranslation } from "@/i18n/context";
import { deriveReceiptTitle, groupItemsByKind } from "@/lib/cart-items";
import { getProgramById, getReceiptById, getSchoolById } from "@/lib/data-source";

export default function ReceiptDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: record } = useSWR(["receipt", params.id], () => getReceiptById(params.id));

  const grouped = record ? groupItemsByKind(record.order.items) : null;
  const isTicket = Boolean(grouped && grouped.programs.length === record!.order.items.length && grouped.programs.length > 0);
  const singleProgramId = isTicket && grouped?.programs.length === 1 ? grouped.programs[0].refId : null;

  const { data: school } = useSWR(record ? ["school", record.order.schoolId] : null, () =>
    getSchoolById(record!.order.schoolId),
  );
  const { data: program } = useSWR(singleProgramId ? ["program", singleProgramId] : null, () =>
    getProgramById(singleProgramId!),
  );
  const venue = program?.venue;

  useEffect(() => {
    if (record === null) {
      router.replace("/receipts");
    }
  }, [record, router]);

  // Loading (or redirecting away from a receipt that doesn't exist): a placeholder card, never a blank page.
  if (!record) {
    return (
      <>
        <AppHeader title={t.receiptsPage.title} backHref="/receipts" showAvatar />
        <div className="w-full p-4 sm:p-6 lg:p-8">
          <ReceiptCardSkeleton />
        </div>
      </>
    );
  }

  async function handleDownload() {
    if (!cardRef.current) return;
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(cardRef.current, { backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.download = `${record!.receipt.qrPayload}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  const receiptTitle = deriveReceiptTitle(record.order.items, {
    books: t.receiptsPage.titleBooks,
    uniform: t.receiptsPage.titleUniform,
    receiptWord: t.receiptsPage.titleReceiptWord,
    programmeReceiptWord: t.receiptsPage.titleProgrammeReceiptWord,
  });
  async function handleShare() {
    const shareData = {
      title: receiptTitle,
      text: `${school?.name ?? ""} — ${receiptTitle} ${record!.receipt.qrPayload}`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled — nothing to do
      }
      return;
    }
    await navigator.clipboard.writeText(shareData.url);
  }

  return (
    <>
      <AppHeader title={receiptTitle} backHref="/receipts" />
      <div className="w-full space-y-4 p-4 pb-8 sm:p-6 lg:p-8">
        <div ref={cardRef}>
          <ReceiptCard
            title={receiptTitle}
            schoolName={school?.name ?? ""}
            items={record.order.items}
            amount={record.order.totalAmount}
            date={record.receipt.issuedAt}
            qrValue={record.receipt.qrPayload}
            status={toBadgeStatus(record.receipt.redemptionStatus)}
            variant={isTicket ? "ticket" : "receipt"}
            venue={venue}
            onDownload={handleDownload}
            onShare={handleShare}
          />
        </div>
      </div>
    </>
  );
}
