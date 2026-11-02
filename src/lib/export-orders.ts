import { formatAddress } from "@/lib/address";
import { isNewAdmission } from "@/lib/academic-year";
import { collectionStatusText } from "@/lib/export-collection";
import type { WorkbookSheet } from "@/lib/export-utils";
import { formatDate } from "@/lib/format";
import { isLineCollected, isLinePartlyCollected } from "@/lib/order-items";
import type { OrderItem, PaymentRecord } from "@/types";

const lineTotal = (item: OrderItem) => item.unitPrice * item.quantity;
const KIND_ORDER: Record<OrderItem["kind"], number> = { book: 0, uniform: 1, program: 2 };
const KIND_NAME: Record<OrderItem["kind"], string> = { book: "Books", uniform: "Uniform", program: "Program" };

/**
 * Spreadsheet export of orders — ONE row per order (one per student per purchase), and ONE column per
 * item, so every amount is its own number cell and Excel can sum any column (an item across all students,
 * all books, all uniform, the grand total) without anyone untangling text.
 *
 *  • "Orders" sheet: student details, one AMOUNT column per item (blank when not bought), Books / Uniform /
 *    Programs totals and the Order Total.
 *  • "Collection" sheet: the same rows and item columns, but each cell says whether that item was handed
 *    over (and the size, for uniform).
 */
export function orderExportSheets(
  records: PaymentRecord[],
  options: { classLabelOf: (classLevelId: string) => string; startMonth: number },
): WorkbookSheet[] {
  // Every item that appears in any of these orders becomes a column (books first, then uniform, then programs).
  const columns = new Map<string, { kind: OrderItem["kind"]; label: string }>();
  for (const record of records) {
    for (const item of record.order.items) {
      const key = `${item.kind}:${item.label}`;
      if (!columns.has(key)) columns.set(key, { kind: item.kind, label: item.label });
    }
  }
  const itemColumns = [...columns.entries()].sort(([, a], [, b]) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.label.localeCompare(b.label));
  const itemHeaders = itemColumns.map(([, column]) => `${KIND_NAME[column.kind]}: ${column.label}`);

  const base = (record: PaymentRecord) => [
    record.receipt.qrPayload,
    record.studentName,
    record.registerNumber,
    options.classLabelOf(record.classLevelId),
    record.section ?? "",
    isNewAdmission({ registerNumber: record.registerNumber, override: record.newAdmissionOverride ?? null }, new Date(), options.startMonth) ? "Yes" : "No",
  ];
  const baseHeader = ["Receipt Code", "Student Name", "Register Number", "Class", "Section", "New Admission"];

  const amountRows: (string | number)[][] = [
    [...baseHeader, ...itemHeaders, "Books Total", "Uniform Total", "Programs Total", "Order Total", "Payment Method", "Order Status", "Collection Status", "Items Collected", "Items Not Collected", "Paid On", "Delivery Address", "Delivery Phone"],
  ];
  const collectionRows: (string | number)[][] = [[...baseHeader, ...itemHeaders, "Collection Status"]];

  for (const record of records) {
    const items = record.order.items;
    const byKey = new Map(items.map((item) => [`${item.kind}:${item.label}`, item]));
    const sum = (kind: OrderItem["kind"]) => items.filter((item) => item.kind === kind).reduce((total, item) => total + lineTotal(item), 0);
    const collectable = items.filter((item) => item.kind !== "program");
    const collected = collectable.filter((item) => isLineCollected(item)).length;

    amountRows.push([
      ...base(record),
      ...itemColumns.map(([key]) => {
        const item = byKey.get(key);
        return item ? lineTotal(item) : "";
      }),
      sum("book"),
      sum("uniform"),
      sum("program"),
      record.order.totalAmount,
      record.order.paymentMethod,
      record.order.status,
      record.receipt.redemptionStatus,
      collected,
      collectable.length - collected,
      formatDate(record.receipt.issuedAt),
      formatAddress(record.address),
      record.address?.phone ?? record.studentPhone ?? "",
    ]);

    collectionRows.push([
      ...base(record),
      ...itemColumns.map(([key]) => {
        const item = byKey.get(key);
        if (!item) return "";
        if (item.kind === "program") return "Registered";
        const size = item.kind === "uniform" && item.meta ? `Size ${item.meta} — ` : "";
        const state = item.parts?.length
          ? collectionStatusText(item)
          : isLineCollected(item)
            ? "Collected"
            : isLinePartlyCollected(item)
              ? "Partly collected"
              : "Not collected";
        return size + state;
      }),
      record.receipt.redemptionStatus,
    ]);
  }

  return [
    { name: "Orders", rows: amountRows },
    { name: "Collection", rows: collectionRows },
  ];
}
