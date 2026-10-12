"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { AddressInline } from "@/components/console/address-display";
import { StatusBadge, toBadgeStatus } from "@/components/shared/status-badge";
import { deriveReceiptTitle } from "@/lib/cart-items";
import { formatDate, formatTime } from "@/lib/format";
import { isLineCollected, isLinePartlyCollected } from "@/lib/order-items";
import { cn } from "@/lib/utils";
import type { OrderItem, PaymentRecord } from "@/types";

const RECEIPT_TITLE_LABELS = {
  books: "Books",
  uniform: "Uniform",
  receiptWord: "Receipt",
  programmeReceiptWord: "Programme Receipt",
};

/** "Collected" / "Not collected" / "Partially collected (x of y)" for one order line. Programs aren't collected, so they get no badge. */
function LineCollectionBadge({ item }: { item: OrderItem }) {
  if (item.kind === "program") return null;
  const parts = item.parts ?? [];
  const partly = isLinePartlyCollected(item);
  const done = isLineCollected(item);
  const label = partly ? `Partially collected · ${parts.filter((p) => p.collectedAt).length} of ${parts.length}` : done ? "Collected" : "Not collected";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        done ? "bg-section-essentials-bg text-section-essentials" : partly ? "bg-section-programs-bg text-section-programs" : "bg-muted text-sub",
      )}
    >
      {label}
    </span>
  );
}

/** One order line, with its collection badge — and, for a book set, every item inside it with its own badge. */
function ReceiptLine({ item }: { item: OrderItem }) {
  const [open, setOpen] = useState(false);
  const parts = item.parts ?? [];
  return (
    <li className="py-1.5 text-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-ink">{item.label}</p>
          {item.meta ? <p className="text-sub">{item.meta}</p> : null}
          {item.quantity > 1 ? <p className="text-sub">Qty {item.quantity}</p> : null}
          {item.kind !== "program" && item.collectedAt ? <p className="text-sub">Collected {formatDate(item.collectedAt)}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-medium text-ink">₹{item.unitPrice * item.quantity}</span>
          <LineCollectionBadge item={item} />
        </div>
      </div>
      {parts.length > 0 ? (
        <div className="mt-1.5">
          <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
            {open ? "Hide" : "Show"} {parts.length} items in this set
            <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          </button>
          {open ? (
            <ul className="mt-1.5 divide-y divide-line/70 rounded-lg bg-muted/40 px-2.5">
              {parts.map((part) => (
                <li key={part.id} className="flex items-start justify-between gap-3 py-1.5">
                  <span className="min-w-0 text-ink">
                    {part.name}
                    {part.quantity > 1 ? <span className="text-sub"> × {part.quantity}</span> : null}
                    {part.starred ? <span className="text-sub"> · given in class</span> : null}
                  </span>
                  <span className={cn("shrink-0 text-[11px] font-medium", part.collectedAt ? "text-section-essentials" : "text-sub")}>
                    {part.collectedAt ? `Collected ${formatDate(part.collectedAt)}` : "Not collected"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

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
              <ReceiptLine key={item.id} item={item} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
