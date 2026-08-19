"use client";

import { useEffect, useState } from "react";

/** Delays reflecting a fast-changing value (e.g. a search box) until it's stopped changing for `delayMs` — used to avoid firing a server query on every keystroke. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
