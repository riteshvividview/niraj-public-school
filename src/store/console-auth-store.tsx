"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getCurrentConsoleStaff, logoutConsoleStaff } from "@/lib/data-source";
import type { ConsoleStaffProfile } from "@/types";

/**
 * Real auth for the School Console — a Payload `auth: true` collection
 * (`payload-admins`, the same one raw /admin uses, split by `role`), session
 * held as an HTTP-only cookie Payload sets on login. This store doesn't call
 * Payload's login endpoint itself — src/app/(frontend)/console/login/page.tsx
 * does (via the console-auth precheck/verify-OTP routes, then
 * payloadLogin), per the data-access-layer rule. On mount, and after a
 * successful login, it just checks for an existing session via
 * getCurrentConsoleStaff() (GET /api/payload-admins/me).
 *
 * Kept as a separate React context/namespace from the parent/student
 * `useAuth()` (src/store/auth-store.tsx) — console and parent sessions are
 * two different account systems that happen to share one browser.
 */
interface ConsoleAuthContextValue {
  staff: ConsoleStaffProfile | null;
  isAuthenticated: boolean;
  /** True once the initial session check (cookie -> /api/payload-admins/me) has resolved. */
  isReady: boolean;
  /** Re-reads the session — call right after payloadLogin succeeds. */
  refresh: () => Promise<void>;
  logout: () => void;
}

const ConsoleAuthContext = createContext<ConsoleAuthContextValue | null>(null);

export function ConsoleAuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<ConsoleStaffProfile | null>(null);
  const [isReady, setIsReady] = useState(false);

  async function refresh() {
    const current = await getCurrentConsoleStaff().catch(() => null);
    setStaff(current);
  }

  useEffect(() => {
    let cancelled = false;
    getCurrentConsoleStaff()
      .then((current) => {
        if (cancelled) return;
        setStaff(current);
        setIsReady(true);
      })
      .catch(() => {
        if (!cancelled) setIsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<ConsoleAuthContextValue>(
    () => ({
      staff,
      isAuthenticated: staff !== null,
      isReady,
      refresh,
      logout: () => {
        setStaff(null);
        void logoutConsoleStaff();
      },
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
