import type { PaymentAttempt, PaymentAttemptStatus } from "@/types";
import { payloadFindById, payloadFindPage, payloadUpdate } from "./payload-rest";

/**
 * Console — payment attempts (every try at paying, including the ones that never
 * became an order), the provider status, and the administrator's payment settings.
 */
export interface PaymentAttemptRecord extends PaymentAttempt {
  student: { id: string; name: string; registerNumber: string; classLevelId: string; section?: string; mobileNumber?: string };
  provider: string;
  providerPaymentId?: string;
}

interface PayloadAttemptDoc {
  id: string;
  user: string | { id: string; name: string; username: string; classLevel: string; section?: string | null; mobileNumber?: string | null };
  status: PaymentAttemptStatus;
  amount: number;
  currency: string;
  method?: string | null;
  provider: string;
  providerPaymentId?: string | null;
  expiresAt?: string | null;
  failureReason?: string | null;
  completedAt?: string | null;
  lateSuccess?: boolean | null;
  needsReview?: boolean | null;
  reviewNote?: string | null;
  items: Array<{ kind: string; label: string; meta?: string | null; unitPrice: number; quantity: number }>;
  order?: string | { id: string } | null;
  createdAt: string;
}

export interface PaymentAttemptFilters {
  status?: PaymentAttemptStatus | "ended";
  needsReview?: boolean;
  search?: string;
}

export interface PaymentAttemptsPage {
  records: PaymentAttemptRecord[];
  totalCount: number;
  totalPages: number;
  page: number;
}

export async function getPaymentAttemptsPageBySchool(
  schoolId: string,
  filters: PaymentAttemptFilters,
  page: number,
  pageSize = 20,
): Promise<PaymentAttemptsPage> {
  const and: Record<string, unknown>[] = [{ school: { equals: schoolId } }];
  if (filters.status === "ended") and.push({ status: { in: "failed,cancelled,expired" } });
  else if (filters.status) and.push({ status: { equals: filters.status } });
  if (filters.needsReview) and.push({ needsReview: { equals: true } });
  const search = filters.search?.trim();
  if (search) and.push({ or: [{ "user.name": { contains: search } }, { "user.username": { contains: search } }] });

  const result = await payloadFindPage<PayloadAttemptDoc>("payments", { where: { and }, page, limit: pageSize, sort: "-createdAt", depth: 1 });
  const records: PaymentAttemptRecord[] = [];
  for (const doc of result.docs) {
    if (typeof doc.user === "string") continue; // needs depth=1
    records.push({
      id: doc.id,
      status: doc.status,
      amount: doc.amount,
      currency: doc.currency,
      method: doc.method ?? undefined,
      createdAt: doc.createdAt,
      completedAt: doc.completedAt ?? undefined,
      expiresAt: doc.expiresAt ?? undefined,
      failureReason: doc.failureReason ?? undefined,
      lateSuccess: Boolean(doc.lateSuccess),
      needsReview: Boolean(doc.needsReview),
      reviewNote: doc.reviewNote ?? undefined,
      items: doc.items.map((item) => ({ kind: item.kind, label: item.label, meta: item.meta ?? undefined, unitPrice: item.unitPrice, quantity: item.quantity })),
      provider: doc.provider,
      providerPaymentId: doc.providerPaymentId ?? undefined,
      student: {
        id: doc.user.id,
        name: doc.user.name,
        registerNumber: doc.user.username,
        classLevelId: doc.user.classLevel,
        section: doc.user.section ?? undefined,
        mobileNumber: doc.user.mobileNumber ?? undefined,
      },
    });
  }
  return { records, totalCount: result.totalDocs, totalPages: result.totalPages, page: result.page };
}

/** How many attempts need a staff look (a possible double payment, or money that arrived late). */
export async function countPaymentsNeedingReview(schoolId: string): Promise<number> {
  const result = await payloadFindPage<PayloadAttemptDoc>("payments", {
    where: { and: [{ school: { equals: schoolId } }, { needsReview: { equals: true } }] },
    limit: 1,
  });
  return result.totalDocs;
}

export interface PaymentProviderInfo {
  provider: string;
  label: string;
  testMode: boolean;
  available: boolean;
  missingKeys: string[];
  webhookMissing: string[];
  webhookUrl: string;
  webhookNote: string;
  sandbox?: boolean;
}

export async function getPaymentProviderInfo(): Promise<PaymentProviderInfo> {
  const res = await fetch("/api/payments/config", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load the payment provider status.");
  return (await res.json()) as PaymentProviderInfo;
}

export interface PaymentSettings {
  duplicateWindowMinutes: number;
  pendingTimeoutMinutes: number;
}

export async function getPaymentSettings(schoolId: string): Promise<PaymentSettings> {
  const doc = await payloadFindById<{ paymentDuplicateWindowMinutes?: number | null; paymentPendingTimeoutMinutes?: number | null }>("schools", schoolId);
  return {
    duplicateWindowMinutes: doc?.paymentDuplicateWindowMinutes ?? 30,
    pendingTimeoutMinutes: doc?.paymentPendingTimeoutMinutes ?? 30,
  };
}

/** Administrator-only (field-level access); reads back to confirm it was really saved. */
export async function setPaymentSettings(schoolId: string, settings: PaymentSettings): Promise<PaymentSettings> {
  await payloadUpdate("schools", schoolId, {
    paymentDuplicateWindowMinutes: settings.duplicateWindowMinutes,
    paymentPendingTimeoutMinutes: settings.pendingTimeoutMinutes,
  });
  const stored = await getPaymentSettings(schoolId);
  if (stored.duplicateWindowMinutes !== settings.duplicateWindowMinutes || stored.pendingTimeoutMinutes !== settings.pendingTimeoutMinutes) {
    throw new Error("Only an administrator can change these settings.");
  }
  return stored;
}
