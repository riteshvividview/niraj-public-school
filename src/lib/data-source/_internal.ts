/**
 * Simulates network latency for mock reads so loading states (skeletons,
 * spinners) built against this data behave the same once Phase 9 swaps in
 * real Payload calls.
 */
export function withDelay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * Mutable overlay on top of a seed array — backs Phase 8's Catalogue/Program
 * Manager writes. Backed by `localStorage`, keyed by `storageKey`, **not** a
 * plain module-level variable: Next.js App Router code-splits per route, and
 * a plain `let items = [...seed]` closure was found (via Playwright testing)
 * to end up duplicated across separate route chunks — a console edit was
 * invisible from the parent app's screens because they held two different
 * in-memory copies. `localStorage` is a real shared, single global resource,
 * so every caller reads/writes the same data regardless of which chunk it's
 * bundled into. This does mean these writes now survive a hard reload too
 * (stronger than the phase's "doesn't need to persist" requirement, not a
 * violation of it) — Phase 9's real Payload connection replaces this either way.
 */
export function createRuntimeCollection<T extends { id: string }>(storageKey: string, seed: T[]) {
  function readAll(): T[] {
    if (typeof window === "undefined") return seed;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return seed;
    try {
      return JSON.parse(raw) as T[];
    } catch {
      return seed;
    }
  }

  function writeAll(items: T[]): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }

  return {
    all: (): T[] => readAll(),
    find: (id: string): T | undefined => readAll().find((item) => item.id === id),
    add: (item: T): void => {
      writeAll([...readAll(), item]);
    },
    update: (id: string, patch: Partial<T>): T | null => {
      let updated: T | null = null;
      const next = readAll().map((item) => {
        if (item.id !== id) return item;
        updated = { ...item, ...patch };
        return updated;
      });
      writeAll(next);
      return updated;
    },
    remove: (id: string): void => {
      writeAll(readAll().filter((item) => item.id !== id));
    },
  };
}
