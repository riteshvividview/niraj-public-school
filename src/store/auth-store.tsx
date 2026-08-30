"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import useSWR, { useSWRConfig } from "swr";
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
 * Backed by SWR (one shared cache key, `"auth:me"`) instead of a bare
 * useState+useEffect — `login()`/`logout()` write straight into that cache
 * with `revalidate: false` (the result is already known, no need to re-hit
 * the network), and every other consumer of `useAuth()` shares the same
 * cached session instead of each mounting its own `/api/users/me` fetch.
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

const AUTH_KEY = "auth:me";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: profile, isLoading } = useSWR(AUTH_KEY, getCurrentUser, { fallbackData: undefined });
  const { mutate } = useSWRConfig();
  const resolvedProfile = profile ?? null;

  // Cart storage is keyed per user (see cart-store.tsx) — switch it whenever
  // the signed-in profile changes, so two accounts on the same browser never
  // share cart state.
  useEffect(() => {
    setActiveCartUser(resolvedProfile?.id ?? null);
  }, [resolvedProfile?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      profile: resolvedProfile,
      isAuthenticated: resolvedProfile !== null,
      isReady: !isLoading,
      login: (nextProfile) => {
        void mutate(AUTH_KEY, nextProfile, { revalidate: false });
      },
      logout: () => {
        void mutate(AUTH_KEY, null, { revalidate: false });
        void logoutUser();
      },
    }),
    [resolvedProfile, isLoading, mutate],
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
