"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

const STORAGE_KEY = "nps-console-session";

/**
 * Mock auth for school staff — deliberately separate storage key and
 * separate React context from the parent/student `useAuth()`
 * (src/store/auth-store.tsx), per the phase spec: console and parent
 * sessions must never share state, even though they run in the same app.
 */
export interface ConsoleStaff {
  name: string;
  email: string;
}

/** The one demo account — shown directly on the login screen, same spirit as the parent app's demo OTP. */
export const DEMO_STAFF_EMAIL = "admin@nirajpublicschool.edu.in";
export const DEMO_STAFF_PASSWORD = "admin123";

type Listener = () => void;
const listeners = new Set<Listener>();
let cachedStaff: ConsoleStaff | null = null;
let hasReadStorage = false;

function readStoredStaff(): ConsoleStaff | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ConsoleStaff;
  } catch {
    return null;
  }
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ConsoleStaff | null {
  if (!hasReadStorage) {
    cachedStaff = readStoredStaff();
    hasReadStorage = true;
  }
  return cachedStaff;
}

function getServerSnapshot(): ConsoleStaff | null {
  return null;
}

function persistLogin(staff: ConsoleStaff) {
  cachedStaff = staff;
  hasReadStorage = true;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(staff));
  listeners.forEach((listener) => listener());
}

function persistLogout() {
  cachedStaff = null;
  hasReadStorage = true;
  window.localStorage.removeItem(STORAGE_KEY);
  listeners.forEach((listener) => listener());
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

interface ConsoleAuthContextValue {
  staff: ConsoleStaff | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (staff: ConsoleStaff) => void;
  logout: () => void;
}

const ConsoleAuthContext = createContext<ConsoleAuthContextValue | null>(null);

export function ConsoleAuthProvider({ children }: { children: ReactNode }) {
  const staff = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isReady = useSyncExternalStore(subscribeMounted, getMountedSnapshot, getMountedServerSnapshot);

  const value = useMemo<ConsoleAuthContextValue>(
    () => ({
      staff,
      isAuthenticated: staff !== null,
      isReady,
      login: persistLogin,
      logout: persistLogout,
    }),
    [staff, isReady],
  );

  return <ConsoleAuthContext.Provider value={value}>{children}</ConsoleAuthContext.Provider>;
}

export function useConsoleAuth() {
  const ctx = useContext(ConsoleAuthContext);
  if (!ctx) {
    throw new Error("useConsoleAuth must be used within a ConsoleAuthProvider");
  }
  return ctx;
}
