"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
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

  useEffect(() => {
    if (!isLanguageReady || !isAuthReady) return;
    if (!hasChosenLanguage) {
      router.replace("/language");
    } else if (isAuthenticated) {
      router.replace("/home");
    } else {
      router.replace("/login");
    }
  }, [isLanguageReady, isAuthReady, hasChosenLanguage, isAuthenticated, router]);

  return null;
}
