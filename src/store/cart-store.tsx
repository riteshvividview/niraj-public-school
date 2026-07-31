"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { CartItem } from "@/types";

const STORAGE_KEY = "nps-cart";

/**
 * Shared cart state for essentials (Phase 5) and, later, program enrollments
 * (Phase 7) — both are just CartItem lines. Phase 6 builds checkout directly
 * on top of this; don't reshape it without checking what Phase 6/7 expect.
 *
 * Books/Stationery are "default included" (plan.html: fixed list, not
 * à la carte) — pages call `ensureDefault()` per catalogue item on load, and
 * that only takes effect if the line hasn't been explicitly excluded before
 * (tracked separately in `excludedIds`, so a removal sticks across remounts
 * instead of being silently re-added). Uniform items are never defaulted —
 * they only enter the cart once a size is confirmed via `setIncluded()`.
 */
interface CartState {
  items: CartItem[];
  excludedIds: string[];
}

function lineId(kind: CartItem["kind"], refId: string): string {
  return `${kind}-${refId}`;
}

type Listener = () => void;
const listeners = new Set<Listener>();
let cachedState: CartState = { items: [], excludedIds: [] };
let hasReadStorage = false;

function readStoredState(): CartState {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { items: [], excludedIds: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<CartState>;
    return { items: parsed.items ?? [], excludedIds: parsed.excludedIds ?? [] };
  } catch {
    return { items: [], excludedIds: [] };
  }
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CartState {
  if (!hasReadStorage) {
    cachedState = readStoredState();
    hasReadStorage = true;
  }
  return cachedState;
}

function getServerSnapshot(): CartState {
  return { items: [], excludedIds: [] };
}

function persist(next: CartState) {
  cachedState = next;
  hasReadStorage = true;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

function setIncluded(item: CartItem, included: boolean) {
  const current = getSnapshot();
  const withoutItem = current.items.filter((existing) => existing.id !== item.id);
  const withoutExcluded = current.excludedIds.filter((id) => id !== item.id);

  if (included) {
    persist({ items: [...withoutItem, item], excludedIds: withoutExcluded });
  } else {
    persist({ items: withoutItem, excludedIds: [...withoutExcluded, item.id] });
  }
}

function ensureDefault(item: CartItem) {
  const current = getSnapshot();
  const alreadyDecided =
    current.excludedIds.includes(item.id) || current.items.some((existing) => existing.id === item.id);
  if (alreadyDecided) return;
  persist({ items: [...current.items, item], excludedIds: current.excludedIds });
}

function clearCart() {
  persist({ items: [], excludedIds: [] });
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

interface CartContextValue {
  items: CartItem[];
  isReady: boolean;
  count: number;
  total: number;
  isIncluded: (id: string) => boolean;
  getItem: (id: string) => CartItem | undefined;
  setIncluded: (item: CartItem, included: boolean) => void;
  ensureDefault: (item: CartItem) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isReady = useSyncExternalStore(subscribeMounted, getMountedSnapshot, getMountedServerSnapshot);

  const value = useMemo<CartContextValue>(() => {
    const total = state.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    return {
      items: state.items,
      isReady,
      count: state.items.length,
      total,
      isIncluded: (id) => state.items.some((item) => item.id === id),
      getItem: (id) => state.items.find((item) => item.id === id),
      setIncluded,
      ensureDefault,
      clear: clearCart,
    };
  }, [state, isReady]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}

export { lineId };
