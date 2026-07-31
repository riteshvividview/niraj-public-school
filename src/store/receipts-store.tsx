"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { CartItem, Order, PaymentMethod, Receipt } from "@/types";

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
  getById: (receiptId: string) => ReceiptRecord | undefined;
  createOrder: typeof createOrder;
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
      getById: (receiptId) => state.records.find((record) => record.receipt.id === receiptId),
      createOrder,
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
