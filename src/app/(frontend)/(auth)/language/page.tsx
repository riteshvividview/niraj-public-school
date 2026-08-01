"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LanguageOptionList } from "@/components/shared/language-switcher";
import { useTranslation } from "@/i18n/context";
import { useAuth } from "@/store/auth-store";
import { AuthShell } from "../_components/auth-shell";

export default function LanguageSelectPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  function handleNext() {
    // A logged-in user changing their language (from Profile) should land
    // back in the app, not be sent to the login screen.
    router.push(isAuthenticated ? "/home" : "/login");
  }

  return (
    <AuthShell
      imageSrc="/languagePage.png"
      imageAlt="School children standing together in their classroom"
      eyebrow="Niraj Public School"
      title={t.auth.language.title}
      subtitle={t.auth.language.subtitle}
    >
      <LanguageOptionList />
      <Button size="lg" className="h-11 w-full gap-2 text-sm sm:h-12 sm:text-base" onClick={handleNext}>
        {t.auth.language.next}
        <ArrowRight className="size-4" />
      </Button>
    </AuthShell>
  );
}
