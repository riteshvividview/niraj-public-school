"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { CartItem } from "@/types";

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
 *
 * Storage is keyed per logged-in user (`nps-cart-<userId>`), not one shared
 * browser-wide key — otherwise switching accounts on the same browser leaks
 * one student's cart into another's. `setActiveCartUser` (called from
 * AuthProvider whenever the session's profile changes) switches which key
 * getSnapshot/persist read and write.
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
let activeUserId: string | null = null;

function storageKey(userId: string): string {
  return `nps-cart-${userId}`;
}

/** Switches whose cart is active — resets the cached snapshot so the next read pulls the new user's own storage key. */
export function setActiveCartUser(userId: string | null) {
  if (userId === activeUserId) return;
  activeUserId = userId;
  cachedState = { items: [], excludedIds: [] };
  hasReadStorage = false;
  listeners.forEach((listener) => listener());
}

function readStoredState(): CartState {
  if (!activeUserId) return { items: [], excludedIds: [] };
  const raw = window.localStorage.getItem(storageKey(activeUserId));
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

const EMPTY_SERVER_STATE: CartState = { items: [], excludedIds: [] };

function getServerSnapshot(): CartState {
  return EMPTY_SERVER_STATE;
}

function persist(next: CartState) {
  cachedState = next;
  hasReadStorage = true;
  if (activeUserId) {
    window.localStorage.setItem(storageKey(activeUserId), JSON.stringify(next));
  }
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

/** Removes a line from the cart by id and marks it excluded, without needing the full CartItem — used to undo a uniform size selection. */
function removeItem(id: string) {
  const current = getSnapshot();
  const withoutItem = current.items.filter((existing) => existing.id !== id);
  const withoutExcluded = current.excludedIds.filter((existingId) => existingId !== id);
  persist({ items: withoutItem, excludedIds: [...withoutExcluded, id] });
}

function ensureDefault(item: CartItem) {
  const current = getSnapshot();
  const alreadyDecided =
    current.excludedIds.includes(item.id) || current.items.some((existing) => existing.id === item.id);
  if (alreadyDecided) return;
  persist({ items: [...current.items, item], excludedIds: current.excludedIds });
}

/**
 * Drops any cart lines of `kind` that aren't in `validIds` — the catalogue a
 * student sees can narrow over time (e.g. staff fills in their language/
 * stream/elective after it was unset, or changes their class/gender), and
 * without this, a book/uniform item that was auto-included or selected
 * under an earlier, broader view stays in the cart forever even once it's
 * no longer part of what they're shown. Called by each essentials page
 * right after it fetches the current catalogue list, before ensureDefault.
 */
function reconcileKind(kind: CartItem["kind"], validIds: string[]) {
  const current = getSnapshot();
  const validSet = new Set(validIds);
  const items = current.items.filter((item) => item.kind !== kind || validSet.has(item.id));
  if (items.length === current.items.length) return;
  persist({ items, excludedIds: current.excludedIds });
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
  remove: (id: string) => void;
  ensureDefault: (item: CartItem) => void;
  reconcileKind: (kind: CartItem["kind"], validIds: string[]) => void;
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
      remove: removeItem,
      ensureDefault,
      reconcileKind,
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
