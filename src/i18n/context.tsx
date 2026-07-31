"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { LanguageCode } from "@/types/language";
import { dictionaries } from "./dictionaries";
import type { Dictionary } from "./types";

const STORAGE_KEY = "nps-language";
const DEFAULT_LANGUAGE: LanguageCode = "en";

function isLanguageCode(value: string | null): value is LanguageCode {
  return !!value && value in dictionaries;
}

// Persisted language is external state (localStorage), so it's read/written
// through useSyncExternalStore rather than mirrored into React state via an
// effect — avoids the extra render pass and hydration mismatch that a
// read-in-effect pattern would cause.
type Listener = () => void;
const languageListeners = new Set<Listener>();
let cachedLanguage: LanguageCode = DEFAULT_LANGUAGE;
/** True once a language has been explicitly chosen/persisted (not just defaulted). */
let cachedHasChosenLanguage = false;
let hasReadStorage = false;

function subscribeLanguage(listener: Listener) {
  languageListeners.add(listener);
  return () => languageListeners.delete(listener);
}

function readStorageOnce() {
  if (hasReadStorage) return;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  cachedHasChosenLanguage = isLanguageCode(stored);
  cachedLanguage = isLanguageCode(stored) ? stored : DEFAULT_LANGUAGE;
  hasReadStorage = true;
}

function getLanguageSnapshot(): LanguageCode {
  readStorageOnce();
  return cachedLanguage;
}

function getLanguageServerSnapshot(): LanguageCode {
  return DEFAULT_LANGUAGE;
}

function getHasChosenLanguageSnapshot(): boolean {
  readStorageOnce();
  return cachedHasChosenLanguage;
}

function getHasChosenLanguageServerSnapshot(): boolean {
  return false;
}

function persistLanguage(next: LanguageCode) {
  cachedLanguage = next;
  cachedHasChosenLanguage = true;
  hasReadStorage = true;
  window.localStorage.setItem(STORAGE_KEY, next);
  languageListeners.forEach((listener) => listener());
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

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  /** True once hydrated on the client, i.e. the persisted language (if any) is loaded. */
  isReady: boolean;
  /** True once the user has explicitly picked a language — false if still on the default. */
  hasChosenLanguage: boolean;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(
    subscribeLanguage,
    getLanguageSnapshot,
    getLanguageServerSnapshot,
  );
  const hasChosenLanguage = useSyncExternalStore(
    subscribeLanguage,
    getHasChosenLanguageSnapshot,
    getHasChosenLanguageServerSnapshot,
  );
  const isReady = useSyncExternalStore(subscribeMounted, getMountedSnapshot, getMountedServerSnapshot);

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage: persistLanguage, isReady, hasChosenLanguage, t: dictionaries[language] }),
    [language, hasChosenLanguage, isReady],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return ctx;
}
