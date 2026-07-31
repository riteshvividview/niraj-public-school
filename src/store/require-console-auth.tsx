"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useConsoleAuth } from "./console-auth-store";

/** Console counterpart to RequireAuth — guards `(dashboard)` behind the separate staff session. */
export function RequireConsoleAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isReady } = useConsoleAuth();

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/console/login");
    }
  }, [isReady, isAuthenticated, router]);

  if (!isReady || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
