"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "./auth-store";

/**
 * Wraps a route group's layout to block it behind the mock parent/student
 * session. Redirect is a navigation side effect (not a setState-in-effect
 * derivation), so this is a normal, lint-safe useEffect usage.
 *
 * Written generically enough that swapping in a real server session check
 * (Phase 9) only changes what useAuth() reads from — not this component.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isReady, isAuthenticated, router]);

  if (!isReady || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
