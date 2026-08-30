import { groupItemsByKind } from "@/lib/cart-items";
import type { ClassLevel, PaymentMethod, PaymentRecord } from "@/types";

/**
 * Pure, synchronous aggregates over an already-fetched `PaymentRecord[]`
 * (from `getPaymentsBySchool`, `src/lib/data-source/receipts.ts`) — the
 * Reports Dashboard fetches the school's whole payment ledger exactly once
 * and derives every chart/tile from it via these functions (`useMemo`),
 * instead of each chart independently re-fetching the whole ledger.
 */

export interface ReportFilter {
  fromDate?: string;
  toDate?: string;
  classLevelId?: string;
}

export function matchesFilter(payment: PaymentRecord, filter?: ReportFilter): boolean {
  if (!filter) return true;
  const date = payment.receipt.issuedAt.slice(0, 10);
  if (filter.fromDate && date < filter.fromDate) return false;
  if (filter.toDate && date > filter.toDate) return false;
  if (filter.classLevelId && payment.classLevelId !== filter.classLevelId) return false;
  return true;
}

export function filterPayments(payments: PaymentRecord[], filter?: ReportFilter): PaymentRecord[] {
  return payments.filter((payment) => matchesFilter(payment, filter));
}

// ---- Overview -------------------------------------------------------------

export interface ReportOverview {
  ordersCount: number;
  revenue: number;
  collected: number;
  pending: number;
  avgOrderValue: number;
}

export function overviewOf(payments: PaymentRecord[], filter?: ReportFilter): ReportOverview {
  const scoped = filterPayments(payments, filter);
  const revenue = scoped.reduce((sum, p) => sum + p.order.totalAmount, 0);
  const pending = scoped.filter((p) => p.receipt.redemptionStatus === "ready").length;
  return {
    ordersCount: scoped.length,
    revenue,
    collected: scoped.length - pending,
    pending,
    avgOrderValue: scoped.length > 0 ? Math.round(revenue / scoped.length) : 0,
  };
}

// ---- Class/section breakdown ----------------------------------------------

export interface ClassBreakdownRow {
  classLevelId: string;
  classLabel: string;
  ordersCount: number;
  revenue: number;
  collected: number;
  pending: number;
}

export function classBreakdownOf(
  payments: PaymentRecord[],
  classLevels: ClassLevel[],
  filter?: ReportFilter,
): ClassBreakdownRow[] {
  const classLabelById = new Map(classLevels.map((level) => [level.id, level.label]));
  const rows = new Map<string, ClassBreakdownRow>(
    classLevels.map((level) => [
      level.id,
      { classLevelId: level.id, classLabel: level.label, ordersCount: 0, revenue: 0, collected: 0, pending: 0 },
    ]),
  );

  for (const payment of filterPayments(payments, filter)) {
    const row =
      rows.get(payment.classLevelId) ??
      ({
        classLevelId: payment.classLevelId,
        classLabel: classLabelById.get(payment.classLevelId) ?? "Unknown class",
        ordersCount: 0,
        revenue: 0,
        collected: 0,
        pending: 0,
      } satisfies ClassBreakdownRow);
    row.ordersCount += 1;
    row.revenue += payment.order.totalAmount;
    if (payment.receipt.redemptionStatus === "ready") row.pending += 1;
    else row.collected += 1;
    rows.set(row.classLevelId, row);
  }

  return Array.from(rows.values()).sort((a, b) =>
    a.classLabel.localeCompare(b.classLabel, undefined, { numeric: true }),
  );
}

// ---- Revenue / orders trend -------------------------------------------------

export interface RevenueTrendPoint {
  /** "YYYY-MM-DD" — one point per day a payment was issued within the filter. */
  date: string;
  revenue: number;
  orders: number;
}

export function revenueTrendOf(payments: PaymentRecord[], filter?: ReportFilter): RevenueTrendPoint[] {
  const buckets = new Map<string, RevenueTrendPoint>();
  for (const payment of filterPayments(payments, filter)) {
    const date = payment.receipt.issuedAt.slice(0, 10);
    const point = buckets.get(date) ?? { date, revenue: 0, orders: 0 };
    point.revenue += payment.order.totalAmount;
    point.orders += 1;
    buckets.set(date, point);
  }
  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ---- Collection status by category -----------------------------------------

export interface CollectionStatusRow {
  category: "books" | "uniform" | "programs";
  collectedValue: number;
  pendingValue: number;
}

export function collectionStatusOf(payments: PaymentRecord[], filter?: ReportFilter): CollectionStatusRow[] {
  const totals: Record<CollectionStatusRow["category"], { collected: number; pending: number }> = {
    books: { collected: 0, pending: 0 },
    uniform: { collected: 0, pending: 0 },
    programs: { collected: 0, pending: 0 },
  };

  for (const payment of filterPayments(payments, filter)) {
    const grouped = groupItemsByKind(payment.order.items);
    const isPending = payment.receipt.redemptionStatus === "ready";
    (["books", "uniform", "programs"] as const).forEach((category) => {
      const amount = grouped[category].reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      if (isPending) totals[category].pending += amount;
      else totals[category].collected += amount;
    });
  }

  return (["books", "uniform", "programs"] as const).map((category) => ({
    category,
    collectedValue: totals[category].collected,
    pendingValue: totals[category].pending,
  }));
}

// ---- Payment method breakdown ------------------------------------------------

export interface PaymentMethodRow {
  method: PaymentMethod;
  revenue: number;
  count: number;
}

export function paymentMethodBreakdownOf(payments: PaymentRecord[], filter?: ReportFilter): PaymentMethodRow[] {
  const totals: Record<PaymentMethod, { revenue: number; count: number }> = {
    upi: { revenue: 0, count: 0 },
    card: { revenue: 0, count: 0 },
    netbanking: { revenue: 0, count: 0 },
  };
  for (const payment of filterPayments(payments, filter)) {
    const method = payment.order.paymentMethod;
    totals[method].revenue += payment.order.totalAmount;
    totals[method].count += 1;
  }
  return (["upi", "card", "netbanking"] as const).map((method) => ({
    method,
    revenue: totals[method].revenue,
    count: totals[method].count,
  }));
}

// ---- Oldest pending ----------------------------------------------------------

/** Longest-outstanding "awaiting collection" payments, oldest first. */
export function oldestPendingOf(payments: PaymentRecord[], filter?: ReportFilter, limit = 10): PaymentRecord[] {
  return filterPayments(payments, filter)
    .filter((p) => p.receipt.redemptionStatus === "ready")
    .sort((a, b) => a.receipt.issuedAt.localeCompare(b.receipt.issuedAt))
    .slice(0, limit);
}

export function daysSince(isoDate: string): number {
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}
