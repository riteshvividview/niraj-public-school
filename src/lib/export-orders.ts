import { formatAddress } from "@/lib/address";
import { isNewAdmission } from "@/lib/academic-year";
import { deriveReceiptTitle } from "@/lib/cart-items";
import { collectionStatusText } from "@/lib/export-collection";
import { formatDate, formatTime } from "@/lib/format";
import { isLineCollected } from "@/lib/order-items";
import type { OrderItem, PaymentRecord } from "@/types";

const RECEIPT_TITLE_LABELS = { books: "Books", uniform: "Uniform", receiptWord: "Receipt", programmeReceiptWord: "Programme Receipt" };

const lineTotal = (item: OrderItem) => item.unitPrice * item.quantity;
const describe = (item: OrderItem) => `${item.label}${item.meta ? ` (${item.meta})` : ""} — ₹${lineTotal(item)} — ${collectionStatusText(item)}`;

/**
 * Spreadsheet export of orders — ONE row per order (receipt), not one per item. Books, uniform and
 * programs each get a column listing their items (with size, price and collection status) and a
 * column with their amount, so the order total is never repeated and adds up across the sheet.
 */
export function orderExportRows(
  records: PaymentRecord[],
  options: { classLabelOf: (classLevelId: string) => string; startMonth: number },
): (string | number)[][] {
  const header = [
    "Receipt Code",
    "Receipt Title",
    "Student Name",
    "Register Number",
    "Class",
    "Section",
    "New Admission",
    "Books",
    "Books Amount",
    "Uniform",
    "Uniform Amount",
    "Programs",
    "Programs Amount",
    "Number of Items",
    "Order Total",
    "Payment Method",
    "Order Status",
    "Collection Status",
    "Items Collected",
    "Still To Hand Over",
    "Issued Date",
    "Issued Time",
    "Collected Date",
    "Collected Time",
    "Delivery Address",
    "Delivery Phone",
    "Order ID",
    "Receipt ID",
  ];
  const rows: (string | number)[][] = [header];
  for (const record of records) {
    const items = record.order.items;
    const of = (kind: OrderItem["kind"]) => items.filter((item) => item.kind === kind);
    const books = of("book");
    const uniform = of("uniform");
    const programs = of("program");
    const sum = (list: OrderItem[]) => list.reduce((total, item) => total + lineTotal(item), 0);
    const collectable = items.filter((item) => item.kind !== "program");
    const collected = collectable.filter((item) => isLineCollected(item));
    const pending = collectable.filter((item) => !isLineCollected(item));
    rows.push([
      record.receipt.qrPayload,
      deriveReceiptTitle(items, RECEIPT_TITLE_LABELS),
      record.studentName,
      record.registerNumber,
      options.classLabelOf(record.classLevelId),
      record.section ?? "",
      isNewAdmission({ registerNumber: record.registerNumber, override: record.newAdmissionOverride ?? null }, new Date(), options.startMonth) ? "Yes" : "No",
      books.map(describe).join(" | "),
      sum(books),
      uniform.map(describe).join(" | "),
      sum(uniform),
      programs.map(describe).join(" | "),
      sum(programs),
      items.length,
      record.order.totalAmount,
      record.order.paymentMethod,
      record.order.status,
      record.receipt.redemptionStatus,
      collectable.length ? `${collected.length} of ${collectable.length}` : "",
      pending.map((item) => (item.parts?.length ? `${item.label}: ${collectionStatusText(item)}` : item.label)).join(" | "),
      formatDate(record.receipt.issuedAt),
      formatTime(record.receipt.issuedAt),
      record.receipt.redeemedAt ? formatDate(record.receipt.redeemedAt) : "",
      record.receipt.redeemedAt ? formatTime(record.receipt.redeemedAt) : "",
      formatAddress(record.address),
      record.address?.phone ?? record.studentPhone ?? "",
      record.order.id,
      record.receipt.id,
    ]);
  }
  return rows;
}
