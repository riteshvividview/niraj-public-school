import type { Address } from "@/types";
import { groupItemsByKind, subtotal } from "@/lib/cart-items";
import type { ReportFilter } from "@/lib/reports-aggregate";
import { filterPayments } from "@/lib/reports-aggregate";
import type { AcademicLanguage, Elective, Gender, Stream } from "@/types";
import { getBooksByClass, getBooksBySchool } from "./books";
import { getClassLevelsBySchool } from "./schools";
import { getEssentialsStockBySchool } from "./essentials-stock";
import { getOrdersBySchool } from "./orders";
import { getPaymentsBySchool } from "./receipts";
import { getPrograms } from "./programs";
import { getStudentsBySchool } from "./users";
import { getUniformItemsByClass, getUniformItemsBySchool } from "./uniform";

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
  /** Actual books+uniform revenue collected from this class (programs excluded — see EssentialsCoverage note). */
  actualRevenue: number;
  /** actualRevenue + estimated cost of what's still unpaid in this class. */
  potentialRevenue: number;
  /** potentialRevenue - actualRevenue. */
  outstandingRevenue: number;
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
  address?: Address;
  hasPaidAnything: boolean;
  hasPaidBooks: boolean;
  hasPaidUniform: boolean;
  essentialsCoverage: EssentialsCoverage;
  /** Real amount paid so far — always exact, never an estimate. */
  actualBooksRevenue: number;
  actualUniformRevenue: number;
  actualTotalRevenue: number;
  /** Catalogue-derived cost of what's NOT yet paid — 0 once a category is paid. Uniform is an average-of-sizes approximation (no stored per-student size). */
  estimatedBooksCost: number;
  estimatedUniformCost: number;
  /** estimatedBooksCost + estimatedUniformCost — what this student still owes at today's prices. */
  outstandingAmount: number;
}

export interface PaymentCoverageSummary {
  totalActualRevenue: number;
  totalPotentialRevenue: number;
  totalOutstandingRevenue: number;
  booksActualRevenue: number;
  booksOutstandingRevenue: number;
  uniformActualRevenue: number;
  uniformOutstandingRevenue: number;
  studentsFullyPaid: number;
  studentsPartiallyPaid: number;
  studentsUnpaid: number;
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
): Promise<{ byClass: PaymentCoverageRow[]; students: CoverageStudent[]; summary: PaymentCoverageSummary }> {
  const [students, classLevels, payments] = await Promise.all([
    getStudentsBySchool(schoolId),
    getClassLevelsBySchool(schoolId),
    getPaymentsBySchool(schoolId),
  ]);

  const anyPaidIds = new Set(payments.map((payment) => payment.receipt.userId));
  const booksPaidIds = new Set<string>();
  const uniformPaidIds = new Set<string>();
  const actualBooksRevenueByUser = new Map<string, number>();
  const actualUniformRevenueByUser = new Map<string, number>();
  for (const payment of payments) {
    const grouped = groupItemsByKind(payment.order.items);
    const userId = payment.receipt.userId;
    if (grouped.books.length > 0) {
      booksPaidIds.add(userId);
      actualBooksRevenueByUser.set(userId, (actualBooksRevenueByUser.get(userId) ?? 0) + subtotal(grouped.books));
    }
    if (grouped.uniform.length > 0) {
      uniformPaidIds.add(userId);
      actualUniformRevenueByUser.set(userId, (actualUniformRevenueByUser.get(userId) ?? 0) + subtotal(grouped.uniform));
    }
  }

  // Estimated cost of what a student would owe, from today's catalogue — cached per
  // (classLevelId, variant) combo so a school-wide roster does a handful of catalogue
  // reads, not one per student.
  const estimatedBooksCostCache = new Map<string, Promise<number>>();
  const estimatedBooksCost = (
    classLevelId: string,
    variant: { language?: AcademicLanguage; stream?: Stream; elective?: Elective },
  ) => {
    const key = `${classLevelId}|${variant.language ?? ""}|${variant.stream ?? ""}|${variant.elective ?? ""}`;
    let promise = estimatedBooksCostCache.get(key);
    if (!promise) {
      promise = getBooksByClass(schoolId, classLevelId, variant).then((books) => books.reduce((sum, b) => sum + b.price, 0));
      estimatedBooksCostCache.set(key, promise);
    }
    return promise;
  };
  const estimatedUniformCostCache = new Map<string, Promise<number>>();
  const estimatedUniformCost = (classLevelId: string, gender: Gender | undefined) => {
    const key = `${classLevelId}|${gender ?? ""}`;
    let promise = estimatedUniformCostCache.get(key);
    if (!promise) {
      promise = getUniformItemsByClass(schoolId, classLevelId, gender).then((items) =>
        items.reduce((sum, item) => {
          if (item.sizeOptions.length === 0) return sum;
          return sum + item.sizeOptions.reduce((s, o) => s + o.price, 0) / item.sizeOptions.length;
        }, 0),
      );
      estimatedUniformCostCache.set(key, promise);
    }
    return promise;
  };

  const classLabelById = new Map(classLevels.map((level) => [level.id, level.label]));
  const byClassMap = new Map<string, PaymentCoverageRow>(
    classLevels.map((level) => [
      level.id,
      {
        classLevelId: level.id,
        classLabel: level.label,
        paidCount: 0,
        totalCount: 0,
        actualRevenue: 0,
        potentialRevenue: 0,
        outstandingRevenue: 0,
      },
    ]),
  );
  const summary: PaymentCoverageSummary = {
    totalActualRevenue: 0,
    totalPotentialRevenue: 0,
    totalOutstandingRevenue: 0,
    booksActualRevenue: 0,
    booksOutstandingRevenue: 0,
    uniformActualRevenue: 0,
    uniformOutstandingRevenue: 0,
    studentsFullyPaid: 0,
    studentsPartiallyPaid: 0,
    studentsUnpaid: 0,
  };

  const coverageStudents: CoverageStudent[] = await Promise.all(
    students.map(async (student) => {
      const hasPaidAnything = anyPaidIds.has(student.id);
      const hasPaidBooks = booksPaidIds.has(student.id);
      const hasPaidUniform = uniformPaidIds.has(student.id);
      const essentialsCoverage: EssentialsCoverage =
        hasPaidBooks && hasPaidUniform ? "both" : hasPaidBooks ? "booksOnly" : hasPaidUniform ? "uniformOnly" : "neither";

      const actualBooksRevenue = actualBooksRevenueByUser.get(student.id) ?? 0;
      const actualUniformRevenue = actualUniformRevenueByUser.get(student.id) ?? 0;

      const [booksEstimate, uniformEstimate] = await Promise.all([
        hasPaidBooks
          ? Promise.resolve(0)
          : estimatedBooksCost(student.classLevelId, {
              language: student.academicLanguage,
              stream: student.stream,
              elective: student.elective,
            }),
        hasPaidUniform ? Promise.resolve(0) : estimatedUniformCost(student.classLevelId, student.gender),
      ]);

      return {
        id: student.id,
        name: student.name,
        registerNumber: student.registerNumber,
        classLevelId: student.classLevelId,
        section: student.section,
        mobileNumber: student.mobileNumber,
        address: student.address,
        hasPaidAnything,
        hasPaidBooks,
        hasPaidUniform,
        essentialsCoverage,
        actualBooksRevenue,
        actualUniformRevenue,
        actualTotalRevenue: actualBooksRevenue + actualUniformRevenue,
        estimatedBooksCost: booksEstimate,
        estimatedUniformCost: uniformEstimate,
        outstandingAmount: booksEstimate + uniformEstimate,
      } satisfies CoverageStudent;
    }),
  );

  for (const student of coverageStudents) {
    const row =
      byClassMap.get(student.classLevelId) ??
      ({
        classLevelId: student.classLevelId,
        classLabel: classLabelById.get(student.classLevelId) ?? "Unknown class",
        paidCount: 0,
        totalCount: 0,
        actualRevenue: 0,
        potentialRevenue: 0,
        outstandingRevenue: 0,
      } satisfies PaymentCoverageRow);
    row.totalCount += 1;
    if (student.hasPaidAnything) row.paidCount += 1;
    row.actualRevenue += student.actualTotalRevenue;
    row.outstandingRevenue += student.outstandingAmount;
    row.potentialRevenue += student.actualTotalRevenue + student.outstandingAmount;
    byClassMap.set(row.classLevelId, row);

    summary.totalActualRevenue += student.actualTotalRevenue;
    summary.totalOutstandingRevenue += student.outstandingAmount;
    summary.booksActualRevenue += student.actualBooksRevenue;
    summary.booksOutstandingRevenue += student.estimatedBooksCost;
    summary.uniformActualRevenue += student.actualUniformRevenue;
    summary.uniformOutstandingRevenue += student.estimatedUniformCost;
    if (student.essentialsCoverage === "both") summary.studentsFullyPaid += 1;
    else if (student.essentialsCoverage === "neither") summary.studentsUnpaid += 1;
    else summary.studentsPartiallyPaid += 1;
  }
  summary.totalPotentialRevenue = summary.totalActualRevenue + summary.totalOutstandingRevenue;

  return {
    byClass: Array.from(byClassMap.values()).sort((a, b) =>
      a.classLabel.localeCompare(b.classLabel, undefined, { numeric: true }),
    ),
    students: coverageStudents.sort((a, b) => a.name.localeCompare(b.name)),
    summary,
  };
}
