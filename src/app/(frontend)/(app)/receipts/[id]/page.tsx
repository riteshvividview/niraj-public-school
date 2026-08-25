"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { ReceiptCard } from "@/components/shared/receipt-card";
import { toBadgeStatus } from "@/components/shared/status-badge";
import { useTranslation } from "@/i18n/context";
import { deriveReceiptTitle, groupItemsByKind } from "@/lib/cart-items";
import { getProgramById, getReceiptById, getSchoolById } from "@/lib/data-source";
import type { ReceiptRecord, School } from "@/types";

export default function ReceiptDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [record, setRecord] = useState<ReceiptRecord | null | undefined>(undefined);
  const [school, setSchool] = useState<School | null>(null);
  const [venue, setVenue] = useState<string | undefined>(undefined);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getReceiptById(params.id).then(setRecord);
  }, [params.id]);

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
    if (record === null) {
      router.replace("/receipts");
    }
  }, [record, router]);

  if (!record) return null;

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
