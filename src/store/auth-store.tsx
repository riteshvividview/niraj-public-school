"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getCurrentUser, logoutUser } from "@/lib/data-source";
import { setActiveCartUser } from "@/store/cart-store";
import type { UserProfile } from "@/types";

/**
 * Real auth for the parent/student app — a Payload `auth: true` collection
 * (`users`, email/password), session held as an HTTP-only cookie Payload
 * sets on login/register. This store doesn't talk to Payload directly for
 * login/register (src/lib/data-source/users.ts does, per the data-access-
 * layer rule) — it just holds the resulting profile and, on mount, checks
 * for an existing cookie session via getCurrentUser() (GET /api/users/me).
 *
 * Public shape (profile / isAuthenticated / isReady / login / logout) is
 * unchanged from the old mock-OTP version on purpose — RequireAuth and every
 * call site keep working without changes.
 *
 * Phase 8's school console uses a *separate* mock auth store/namespace —
 * school staff and parent accounts are not the same session per plan.html.
 */
interface AuthContextValue {
  profile: UserProfile | null;
  isAuthenticated: boolean;
  /** True once the initial session check (cookie -> /api/users/me) has resolved. */
  isReady: boolean;
  login: (profile: UserProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        setProfile(user);
        setIsReady(true);
      })
      .catch(() => {
        if (!cancelled) setIsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Cart storage is keyed per user (see cart-store.tsx) — switch it whenever
  // the signed-in profile changes, so two accounts on the same browser never
  // share cart state.
  useEffect(() => {
    setActiveCartUser(profile?.id ?? null);
  }, [profile?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      isAuthenticated: profile !== null,
      isReady,
      login: setProfile,
      logout: () => {
        setProfile(null);
        void logoutUser();
      },
    }),
    [profile, isReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
