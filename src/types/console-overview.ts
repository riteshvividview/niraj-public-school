/** Console — school-wide numbers that tie every feature together (see /api/console/overview). */
export interface ConsoleOverview {
  requests: { exchanges: number; subjectChanges: number; support: number; extraItems: number };
  /** Payment attempts in the last 30 days. */
  payments30d: { paid: number; pending: number; failed: number; abandoned: number };
  /** Payments (any age) flagged for a staff look — a possible double payment, or money that arrived late. */
  paymentsNeedingReview: number;
  /** Items inside purchased book sets that haven't been handed over yet. */
  outstandingItems: { receipts: number; items: number; top: Array<{ name: string; students: number; quantity: number }> };
  newAdmission: { academicYear: string; newCount: number; setBoughtCount: number; waitingCount: number };
}
