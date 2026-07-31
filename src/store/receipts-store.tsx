"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { CartItem, Order, PaymentMethod, Receipt, RedemptionStatus } from "@/types";

const STORAGE_KEY = "nps-receipts";

export interface ReceiptRecord {
  order: Order;
  receipt: Receipt;
}

interface ReceiptsState {
  records: ReceiptRecord[];
}

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * One seeded historical order so My Receipts isn't empty for the demo
 * profile on first login (per Phase 6 spec) — Ananya (the other seed user)
 * intentionally has none, to keep exercising the empty state from Phase 2.
 * Seeded once only, when localStorage has never held this key before —
 * checked in readStoredState(), not on every login.
 */
function buildSeedRecord(): ReceiptRecord {
  const issuedAt = "2026-06-20T10:00:00.000Z";
  const items: CartItem[] = [
    {
      id: "stationery-stationery-class-6-notebooks",
      kind: "stationery",
      refId: "stationery-class-6-notebooks",
      label: "Ruled Notebooks",
      meta: "Set of 5",
      unitPrice: 175,
      quantity: 1,
    },
    {
      id: "stationery-stationery-class-6-geometry",
      kind: "stationery",
      refId: "stationery-class-6-geometry",
      label: "Geometry Box",
      meta: "1 box",
      unitPrice: 145,
      quantity: 1,
    },
  ];
  const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const orderId = "order-seed-ritesh-1";
  const order: Order = {
    id: orderId,
    userId: "user-ritesh",
    schoolId: "school-niraj",
    items,
    totalAmount,
    paymentMethod: "upi",
    status: "paid",
    createdAt: issuedAt,
    updatedAt: issuedAt,
  };
  const receipt: Receipt = {
    id: "receipt-seed-ritesh-1",
    orderId,
    userId: "user-ritesh",
    schoolId: "school-niraj",
    qrPayload: "receipt-seed-ritesh-1",
    redemptionStatus: "collected",
    issuedAt,
    redeemedAt: "2026-06-21T09:30:00.000Z",
    createdAt: issuedAt,
    updatedAt: "2026-06-21T09:30:00.000Z",
  };
  return { order, receipt };
}

type Listener = () => void;
const listeners = new Set<Listener>();
let cachedState: ReceiptsState = { records: [] };
let hasReadStorage = false;

function readStoredState(): ReceiptsState {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    // First time ever — seed the demo history.
    return { records: [buildSeedRecord()] };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ReceiptsState>;
    return { records: parsed.records ?? [] };
  } catch {
    return { records: [] };
  }
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ReceiptsState {
  if (!hasReadStorage) {
    cachedState = readStoredState();
    hasReadStorage = true;
  }
  return cachedState;
}

function getServerSnapshot(): ReceiptsState {
  return { records: [] };
}

function persist(next: ReceiptsState) {
  cachedState = next;
  hasReadStorage = true;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

function createOrder(input: {
  userId: string;
  schoolId: string;
  items: CartItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
}): ReceiptRecord {
  const now = new Date().toISOString();
  const orderId = uniqueId("order");
  const order: Order = {
    id: orderId,
    userId: input.userId,
    schoolId: input.schoolId,
    items: input.items,
    totalAmount: input.totalAmount,
    paymentMethod: input.paymentMethod,
    status: "paid",
    createdAt: now,
    updatedAt: now,
  };
  const receiptId = uniqueId("receipt");
  const receipt: Receipt = {
    id: receiptId,
    orderId,
    userId: input.userId,
    schoolId: input.schoolId,
    qrPayload: receiptId,
    redemptionStatus: "ready",
    issuedAt: now,
    redeemedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const record: ReceiptRecord = { order, receipt };
  const current = getSnapshot();
  persist({ records: [record, ...current.records] });
  return record;
}

/**
 * Console — Receipt / QR Scanner. Returns null if the receipt doesn't exist
 * or isn't in "ready" state (already redeemed) — callers decide how to
 * present that (invalid vs. already-redeemed) rather than this function
 * throwing, since both are normal, expected scan outcomes.
 */
function markRedeemed(receiptId: string, status: RedemptionStatus): ReceiptRecord | null {
  const current = getSnapshot();
  const existing = current.records.find((record) => record.receipt.id === receiptId);
  if (!existing || existing.receipt.redemptionStatus !== "ready") return null;

  const now = new Date().toISOString();
  const updatedReceipt: Receipt = {
    ...existing.receipt,
    redemptionStatus: status,
    redeemedAt: now,
    updatedAt: now,
  };
  const updatedRecord: ReceiptRecord = { order: existing.order, receipt: updatedReceipt };
  persist({
    records: current.records.map((record) => (record.receipt.id === receiptId ? updatedRecord : record)),
  });
  return updatedRecord;
}

function subscribeMounted() {
  return () => {};
}
function getMountedSnapshot() {
  return true;
}
function getMountedServerSnapshot() {
  return false;
}

interface ReceiptsContextValue {
  records: ReceiptRecord[];
  isReady: boolean;
  getForUser: (userId: string) => ReceiptRecord[];
  getBySchool: (schoolId: string) => ReceiptRecord[];
  getById: (receiptId: string) => ReceiptRecord | undefined;
  createOrder: typeof createOrder;
  markRedeemed: typeof markRedeemed;
}

const ReceiptsContext = createContext<ReceiptsContextValue | null>(null);

export function ReceiptsProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isReady = useSyncExternalStore(subscribeMounted, getMountedSnapshot, getMountedServerSnapshot);

  const value = useMemo<ReceiptsContextValue>(
    () => ({
      records: state.records,
      isReady,
      getForUser: (userId) =>
        state.records
          .filter((record) => record.order.userId === userId)
          .sort((a, b) => b.receipt.issuedAt.localeCompare(a.receipt.issuedAt)),
      getBySchool: (schoolId) =>
        state.records
          .filter((record) => record.order.schoolId === schoolId)
          .sort((a, b) => b.receipt.issuedAt.localeCompare(a.receipt.issuedAt)),
      getById: (receiptId) => state.records.find((record) => record.receipt.id === receiptId),
      createOrder,
      markRedeemed,
    }),
    [state, isReady],
  );

  return <ReceiptsContext.Provider value={value}>{children}</ReceiptsContext.Provider>;
}

export function useReceipts() {
  const ctx = useContext(ReceiptsContext);
  if (!ctx) {
    throw new Error("useReceipts must be used within a ReceiptsProvider");
  }
  return ctx;
}
