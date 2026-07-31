"use client";

import { useRouter } from "next/navigation";
import { LanguageOptionList } from "@/components/shared/language-switcher";
import { useTranslation } from "@/i18n/context";
import { useAuth } from "@/store/auth-store";

export default function LanguageSelectPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  function handleSelected() {
    // A logged-in user changing their language (from Profile) should land
    // back in the app, not be sent to the login screen.
    router.push(isAuthenticated ? "/home" : "/login");
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-2 font-heading text-lg font-bold text-white">
          NPS
        </div>
        <h1 className="font-heading text-2xl font-bold text-ink">{t.auth.language.title}</h1>
        <p className="text-sm text-sub">{t.auth.language.subtitle}</p>
      </div>
      <LanguageOptionList onSelect={handleSelected} />
    </div>
  );
}
