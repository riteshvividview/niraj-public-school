"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { ReceiptCard } from "@/components/shared/receipt-card";
import { toBadgeStatus } from "@/components/shared/status-badge";
import { useTranslation } from "@/i18n/context";
import { groupItemsByKind, summarizeOrderItems } from "@/lib/cart-items";
import { getProgramById, getSchoolById } from "@/lib/data-source";
import { useReceipts } from "@/store/receipts-store";
import type { School } from "@/types";

export default function ReceiptDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const receipts = useReceipts();
  const [school, setSchool] = useState<School | null>(null);
  const [venue, setVenue] = useState<string | undefined>(undefined);
  const cardRef = useRef<HTMLDivElement>(null);

  const record = receipts.getById(params.id);
  const grouped = record ? groupItemsByKind(record.order.items) : null;
  const isTicket = Boolean(grouped && grouped.programs.length === record!.order.items.length && grouped.programs.length > 0);

  useEffect(() => {
    if (!record) return;
    getSchoolById(record.order.schoolId).then(setSchool);
  }, [record]);

  useEffect(() => {
    if (!isTicket || !grouped || grouped.programs.length !== 1) return;
    getProgramById(grouped.programs[0].refId).then((program) => setVenue(program?.venue));
  }, [isTicket, grouped]);

  useEffect(() => {
    if (receipts.isReady && !record) {
      router.replace("/receipts");
    }
  }, [receipts.isReady, record, router]);

  if (!record) return null;

  const summaryLines = summarizeOrderItems(record.order.items, {
    books: t.essentials.books,
    stationery: t.essentials.stationery,
  });

  async function handleDownload() {
    if (!cardRef.current) return;
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(cardRef.current, { backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.download = `${record!.receipt.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  const pageTitle = isTicket ? t.receiptsPage.ticketTitle : t.receiptsPage.detailTitle;

  async function handleShare() {
    const shareData = {
      title: pageTitle,
      text: `${school?.name ?? ""} — ${pageTitle} ${record!.receipt.id}`,
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
      <AppHeader title={pageTitle} backHref="/receipts" />
      <div className="w-full space-y-4 p-4 pb-8 sm:p-6 lg:p-8">
        <div ref={cardRef}>
          <ReceiptCard
            schoolName={school?.name ?? ""}
            summaryLines={summaryLines}
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
