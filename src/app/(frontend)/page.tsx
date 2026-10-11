"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SplashScreen } from "@/components/shared/splash-screen";
import { useTranslation } from "@/i18n/context";
import { useAuth } from "@/store/auth-store";

/**
 * Not a real screen — just routes to wherever the user actually belongs:
 * first-run language selection, login, or straight into the app.
 */
export default function RootPage() {
  const router = useRouter();
  const { hasChosenLanguage, isReady: isLanguageReady } = useTranslation();
  const { isAuthenticated, isReady: isAuthReady } = useAuth();

  // Start fetching the screens we might need right away, in parallel with the session check.
  useEffect(() => {
    router.prefetch("/language");
    router.prefetch("/login");
    router.prefetch("/home");
  }, [router]);

  useEffect(() => {
    if (!isLanguageReady) return;
    // A first-time visitor has no language saved and can't be logged in: go straight to the
    // language screen without waiting for the server (the session check may be slow on a cold start).
    if (!hasChosenLanguage) {
      router.replace("/language");
      return;
    }
    if (!isAuthReady) return;
    router.replace(isAuthenticated ? "/home" : "/login");
  }, [isLanguageReady, isAuthReady, hasChosenLanguage, isAuthenticated, router]);

  // Never a blank white page: the splash is in the first HTML and stays until the redirect happens.
  return <SplashScreen />;
}
