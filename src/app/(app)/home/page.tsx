"use client";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/context";
import { useAuth } from "@/store/auth-store";

/**
 * Stand-in destination for a successful login/registration — the real Home
 * screen (school essentials preview, upcoming programs, receipts shortcut)
 * is built in Phase 4. This proves the auth flow lands somewhere real and
 * that RequireAuth is working.
 */
export default function HomePlaceholderPage() {
  const { t } = useTranslation();
  const { profile, logout } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-heading text-2xl font-bold text-ink">
        {t.welcome}, {profile?.name}
      </p>
      <p className="max-w-sm text-sm text-sub">
        The real Home screen is built in Phase 4. You&apos;re logged in as{" "}
        {profile?.mobileNumber}.
      </p>
      <Button variant="outline" onClick={logout}>
        Log out
      </Button>
    </div>
  );
}
