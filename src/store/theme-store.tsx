"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

const STORAGE_KEY = "nps-theme";
export type Theme = "light" | "dark";
const DEFAULT_THEME: Theme = "light";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Persisted theme is external state (localStorage + the `dark` class on
 * <html>), read/written through useSyncExternalStore — same pattern as
 * src/i18n/context.tsx's language store. The blocking inline script in
 * layout.tsx applies the class before first paint (avoids a flash of the
 * wrong theme); this store's job is just keeping React and that class in
 * sync afterward.
 */
type Listener = () => void;
const listeners = new Set<Listener>();
let cachedTheme: Theme = DEFAULT_THEME;
let hasReadStorage = false;

function applyClass(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function readStorageOnce() {
  if (hasReadStorage) return;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  cachedTheme = isTheme(stored) ? stored : DEFAULT_THEME;
  hasReadStorage = true;
}

function getSnapshot(): Theme {
  readStorageOnce();
  return cachedTheme;
}

function getServerSnapshot(): Theme {
  return DEFAULT_THEME;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function persistTheme(next: Theme) {
  cachedTheme = next;
  hasReadStorage = true;
  window.localStorage.setItem(STORAGE_KEY, next);
  applyClass(next);
  listeners.forEach((listener) => listener());
}

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => persistTheme(theme === "dark" ? "light" : "dark"),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
