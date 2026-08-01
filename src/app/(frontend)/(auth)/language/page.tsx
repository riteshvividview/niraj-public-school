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
      imageSrc="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&q=80&auto=format&fit=crop"
      imageAlt="An open book resting on a wooden desk"
      eyebrow="Niraj Public School"
      title={t.auth.language.title}
      subtitle={t.auth.language.subtitle}
    >
      <LanguageOptionList />
      <Button size="lg" className="w-full gap-2" onClick={handleNext}>
        {t.auth.language.next}
        <ArrowRight className="size-4" />
      </Button>
    </AuthShell>
  );
}
