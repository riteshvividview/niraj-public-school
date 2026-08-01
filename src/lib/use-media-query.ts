"use client";

import { useSyncExternalStore } from "react";

/**
 * Hydration-safe media query read, same useSyncExternalStore pattern as
 * i18n/auth/cart's localStorage reads (see src/i18n/context.tsx) — the
 * server snapshot is a fixed default so SSR and the first client render
 * agree, then it flips to the real value once mounted.
 */
export function useMediaQuery(query: string, serverSnapshot = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverSnapshot,
  );
}

/** md breakpoint (768px) and up — matches Tailwind's `md:` prefix used throughout this app. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)");
}
