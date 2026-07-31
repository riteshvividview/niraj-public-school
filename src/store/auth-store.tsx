"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { UserProfile } from "@/types";

const STORAGE_KEY = "nps-session";

/**
 * Mock auth for the parent/student app — no server, no real tokens. The
 * "session" is the logged-in user's full profile, persisted wholesale in
 * localStorage. Phase 9 replaces this with real server sessions; keep this
 * store's public shape (isAuthenticated / login / logout) stable so that
 * swap doesn't require touching call sites.
 *
 * Phase 8's school console must use a *separate* mock auth store/namespace
 * (different storage key, different context) — school staff and parent
 * accounts are not the same session per plan.html.
 */
type Listener = () => void;
const listeners = new Set<Listener>();
let cachedProfile: UserProfile | null = null;
let hasReadStorage = false;

function readStoredProfile(): UserProfile | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

function subscribeSession(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSessionSnapshot(): UserProfile | null {
  if (!hasReadStorage) {
    cachedProfile = readStoredProfile();
    hasReadStorage = true;
  }
  return cachedProfile;
}

function getSessionServerSnapshot(): UserProfile | null {
  return null;
}

function persistLogin(profile: UserProfile) {
  cachedProfile = profile;
  hasReadStorage = true;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  listeners.forEach((listener) => listener());
}

function persistLogout() {
  cachedProfile = null;
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

interface AuthContextValue {
  profile: UserProfile | null;
  isAuthenticated: boolean;
  /** True once hydrated on the client, i.e. the persisted session (if any) is loaded. */
  isReady: boolean;
  login: (profile: UserProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const profile = useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionServerSnapshot);
  const isReady = useSyncExternalStore(subscribeMounted, getMountedSnapshot, getMountedServerSnapshot);

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      isAuthenticated: profile !== null,
      isReady,
      login: persistLogin,
      logout: persistLogout,
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
