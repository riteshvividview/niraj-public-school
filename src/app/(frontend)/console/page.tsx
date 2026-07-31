"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useConsoleAuth } from "@/store/console-auth-store";

export default function ConsoleRootPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useConsoleAuth();

  useEffect(() => {
    if (!isReady) return;
    router.replace(isAuthenticated ? "/console/catalogue" : "/console/login");
  }, [isReady, isAuthenticated, router]);

  return null;
}
