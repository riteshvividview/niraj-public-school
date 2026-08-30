import { groupItemsByKind } from "@/lib/cart-items";
import type { ReportFilter } from "@/lib/reports-aggregate";
import { filterPayments } from "@/lib/reports-aggregate";
import { getBooksBySchool } from "./books";
import { getClassLevelsBySchool } from "./schools";
import { getEssentialsStockBySchool } from "./essentials-stock";
import { getOrdersBySchool } from "./orders";
import { getPaymentsBySchool } from "./receipts";
import { getPrograms } from "./programs";
import { getStudentsBySchool } from "./users";
import { getUniformItemsBySchool } from "./uniform";

export type { ReportFilter } from "@/lib/reports-aggregate";

// ---- Stock health: issued vs. on-hand -----------------------------------

export interface StockHealthRow {
  kind: "book" | "uniform";
  refId: string;
  variantKey: string;
  label: string;
  classLevelId: string;
  issuedQuantity: number;
  quantityOnHand: number;
  isTracked: boolean;
  isLow: boolean;
}

function stockKey(kind: string, refId: string, variantKey: string): string {
  return `${kind}:${refId}:${variantKey}`;
}

/**
 * Console — Reports Dashboard "Issued vs. in-stock". Issued = total quantity
 * across every paid order (any collection status) — a broader figure than
 * Stock tab's "pending collection" (which only counts uncollected items) —
 * so a very low `quantityOnHand` next to a high `issuedQuantity` reads as
 * "sold through," not necessarily "behind on handing out."
 */
export async function getStockHealthBySchool(schoolId: string): Promise<StockHealthRow[]> {
  const [books, uniformItems, stockRows, orders] = await Promise.all([
    getBooksBySchool(schoolId),
    getUniformItemsBySchool(schoolId),
    getEssentialsStockBySchool(schoolId),
    getOrdersBySchool(schoolId),
  ]);

  const issuedByKey = new Map<string, number>();
  for (const order of orders) {
    if (order.status !== "paid") continue;
    for (const item of order.items) {
      if (item.kind !== "book" && item.kind !== "uniform") continue;
      const variantKey = item.kind === "uniform" ? (item.meta ?? "") : "";
      const key = stockKey(item.kind, item.refId, variantKey);
      issuedByKey.set(key, (issuedByKey.get(key) ?? 0) + item.quantity);
    }
  }
  const stockByKey = new Map(stockRows.map((row) => [stockKey(row.kind, row.refId, row.variantKey), row]));

  const bookRows: StockHealthRow[] = books.map((book) => {
    const key = stockKey("book", book.id, "");
    const stock = stockByKey.get(key);
    return {
      kind: "book",
      refId: book.id,
      variantKey: "",
      label: book.title,
      classLevelId: book.classLevelId,
      issuedQuantity: issuedByKey.get(key) ?? 0,
      quantityOnHand: stock?.quantityOnHand ?? 0,
      isTracked: Boolean(stock),
      isLow: stock ? stock.quantityOnHand <= stock.lowStockThreshold : false,
    };
  });

  const uniformRows: StockHealthRow[] = uniformItems.flatMap((item) =>
    item.sizeOptions.map((option) => {
      const key = stockKey("uniform", item.id, option.size);
      const stock = stockByKey.get(key);
      return {
        kind: "uniform" as const,
        refId: item.id,
        variantKey: option.size,
        label: `${item.name} (${option.size})`,
        classLevelId: item.classLevelId,
        issuedQuantity: issuedByKey.get(key) ?? 0,
        quantityOnHand: stock?.quantityOnHand ?? 0,
        isTracked: Boolean(stock),
        isLow: stock ? stock.quantityOnHand <= stock.lowStockThreshold : false,
      };
    }),
  );

  return [...bookRows, ...uniformRows];
}

// ---- Programs & Events report ----------------------------------------------

export interface ProgramReportRow {
  programId: string;
  title: string;
  date: string;
  fee: number;
  registrations: number;
  checkedIn: number;
  revenue: number;
  seatsRemaining?: number;
}

/** Console — Reports Dashboard "Programs & Events" drill-down. One row per program, regardless of whether it has any registrations yet. */
export async function getProgramReportBySchool(schoolId: string, filter?: ReportFilter): Promise<ProgramReportRow[]> {
  const [programs, payments] = await Promise.all([getPrograms({ schoolId }), getPaymentsBySchool(schoolId)]);

  const rows = new Map<string, ProgramReportRow>(
    programs.map((program) => [
      program.id,
      {
        programId: program.id,
        title: program.title,
        date: program.date,
        fee: program.fee,
        registrations: 0,
        checkedIn: 0,
        revenue: 0,
        seatsRemaining: program.seatsAvailable,
      },
    ]),
  );

  for (const payment of filterPayments(payments, filter)) {
    for (const item of payment.order.items) {
      if (item.kind !== "program") continue;
      // A paid item can outlive the Program doc it was bought under (deleted
      // afterward) — fall back to a synthetic row rather than silently
      // dropping real revenue, so this report's totals always reconcile
      // with the category-level revenue shown elsewhere on the dashboard.
      let row = rows.get(item.refId);
      if (!row) {
        row = {
          programId: item.refId,
          title: `${item.label} (no longer listed)`,
          date: payment.receipt.issuedAt.slice(0, 10),
          fee: item.unitPrice,
          registrations: 0,
          checkedIn: 0,
          revenue: 0,
        };
        rows.set(item.refId, row);
      }
      row.registrations += item.quantity;
      row.revenue += item.unitPrice * item.quantity;
      if (payment.receipt.redemptionStatus === "checked-in") row.checkedIn += item.quantity;
    }
  }

  return Array.from(rows.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ---- Payment coverage: who's paid, and for what -----------------------------

export interface PaymentCoverageRow {
  classLevelId: string;
  classLabel: string;
  /** Paid for anything at all (any receipt, any status) — the original whole-roster metric, unchanged. */
  paidCount: number;
  totalCount: number;
}

/** Which of the two essentials categories a student has ever paid for — programs don't count toward this (a school essentials store concern, not events). */
export type EssentialsCoverage = "both" | "booksOnly" | "uniformOnly" | "neither";

export interface CoverageStudent {
  id: string;
  name: string;
  registerNumber: string;
  classLevelId: string;
  section?: string;
  mobileNumber?: string;
  hasPaidAnything: boolean;
  hasPaidBooks: boolean;
  hasPaidUniform: boolean;
  essentialsCoverage: EssentialsCoverage;
}

/**
 * Console — Reports Dashboard "Payment coverage" drill-down. Whole-roster
 * completeness, not a period metric (no date filter) — "has this student
 * EVER paid," distinct from collection status (paid but not yet collected).
 * Every student is returned (not just the unpaid ones) so the page can slice
 * by "paid both / books only / uniform only / neither" as well as the
 * original paid-vs-not-paid view.
 */
export async function getPaymentCoverageBySchool(
  schoolId: string,
): Promise<{ byClass: PaymentCoverageRow[]; students: CoverageStudent[] }> {
  const [students, classLevels, payments] = await Promise.all([
    getStudentsBySchool(schoolId),
    getClassLevelsBySchool(schoolId),
    getPaymentsBySchool(schoolId),
  ]);

  const anyPaidIds = new Set(payments.map((payment) => payment.receipt.userId));
  const booksPaidIds = new Set<string>();
  const uniformPaidIds = new Set<string>();
  for (const payment of payments) {
    const grouped = groupItemsByKind(payment.order.items);
    if (grouped.books.length > 0) booksPaidIds.add(payment.receipt.userId);
    if (grouped.uniform.length > 0) uniformPaidIds.add(payment.receipt.userId);
  }

  const classLabelById = new Map(classLevels.map((level) => [level.id, level.label]));
  const byClassMap = new Map<string, PaymentCoverageRow>(
    classLevels.map((level) => [level.id, { classLevelId: level.id, classLabel: level.label, paidCount: 0, totalCount: 0 }]),
  );
  const coverageStudents: CoverageStudent[] = [];

  for (const student of students) {
    const row =
      byClassMap.get(student.classLevelId) ??
      ({
        classLevelId: student.classLevelId,
        classLabel: classLabelById.get(student.classLevelId) ?? "Unknown class",
        paidCount: 0,
        totalCount: 0,
      } satisfies PaymentCoverageRow);
    row.totalCount += 1;

    const hasPaidAnything = anyPaidIds.has(student.id);
    if (hasPaidAnything) row.paidCount += 1;
    byClassMap.set(row.classLevelId, row);

    const hasPaidBooks = booksPaidIds.has(student.id);
    const hasPaidUniform = uniformPaidIds.has(student.id);
    const essentialsCoverage: EssentialsCoverage =
      hasPaidBooks && hasPaidUniform ? "both" : hasPaidBooks ? "booksOnly" : hasPaidUniform ? "uniformOnly" : "neither";

    coverageStudents.push({
      id: student.id,
      name: student.name,
      registerNumber: student.registerNumber,
      classLevelId: student.classLevelId,
      section: student.section,
      mobileNumber: student.mobileNumber,
      hasPaidAnything,
      hasPaidBooks,
      hasPaidUniform,
      essentialsCoverage,
    });
  }

  return {
    byClass: Array.from(byClassMap.values()).sort((a, b) =>
      a.classLabel.localeCompare(b.classLabel, undefined, { numeric: true }),
    ),
    students: coverageStudents.sort((a, b) => a.name.localeCompare(b.name)),
  };
}
