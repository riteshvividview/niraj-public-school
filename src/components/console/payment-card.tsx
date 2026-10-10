"use client";

import { useState } from "react";
import { AddressInline } from "@/components/console/address-display";
import { StatusBadge, toBadgeStatus } from "@/components/shared/status-badge";
import { deriveReceiptTitle } from "@/lib/cart-items";
import { formatDate, formatTime } from "@/lib/format";
import type { PaymentRecord } from "@/types";

const RECEIPT_TITLE_LABELS = {
  books: "Books",
  uniform: "Uniform",
  receiptWord: "Receipt",
  programmeReceiptWord: "Programme Receipt",
};

/** One payment/receipt row — shared by the Payments page and the Reports Dashboard's Orders drill-down. */
export function PaymentCard({ record, classLabel }: { record: PaymentRecord; classLabel: string }) {
  const [expanded, setExpanded] = useState(false);
  const title = deriveReceiptTitle(record.order.items, RECEIPT_TITLE_LABELS);
  return (
    <div className="rounded-xl border border-line/60 p-3.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-wrap items-start justify-between gap-2 text-left"
      >
        <div className="min-w-0">
          <p className="font-medium text-ink">{title}</p>
          <p className="font-mono text-xs tracking-widest text-sub">{record.receipt.qrPayload}</p>
          <p className="mt-0.5 text-xs text-sub">
            {formatDate(record.receipt.issuedAt)} · {formatTime(record.receipt.issuedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink">₹{record.order.totalAmount}</span>
          <StatusBadge status={toBadgeStatus(record.receipt.redemptionStatus)} />
        </div>
      </button>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-sub">
        <span>{record.studentName}</span>
        <span>·</span>
        <span>{record.registerNumber}</span>
        <span>·</span>
        <span>{classLabel}</span>
        {record.section ? (
          <>
            <span>·</span>
            <span>Sec {record.section}</span>
          </>
        ) : null}
      </div>
      <AddressInline address={record.address} className="mt-1.5" />
      {expanded ? (
        <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
          <p className="text-xs text-sub">
            Paid via {record.order.paymentMethod.toUpperCase()}
            {record.receipt.redeemedAt ? (
              <>
                {" "}
                · Redeemed {formatDate(record.receipt.redeemedAt)} at {formatTime(record.receipt.redeemedAt)}
              </>
            ) : null}
          </p>
          <ul className="divide-y divide-line">
            {record.order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-1.5 text-xs">
                <div className="min-w-0">
                  <p className="truncate text-ink">{item.label}</p>
                  {item.meta ? <p className="text-sub">{item.meta}</p> : null}
                  {item.quantity > 1 ? <p className="text-sub">Qty {item.quantity}</p> : null}
                </div>
                <span className="shrink-0 font-medium text-ink">₹{item.unitPrice * item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
