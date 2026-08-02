"use client";

import { Mail, MessageCircle, Phone } from "lucide-react";
import { AppHeader } from "@/components/shared/app-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from "@/i18n/context";
import { useAuth } from "@/store/auth-store";
import { useEffect, useState } from "react";
import { getSchoolById } from "@/lib/data-source";
import type { School } from "@/types";

export default function HelpPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [school, setSchool] = useState<School | null>(null);

  useEffect(() => {
    if (!profile) return;
    getSchoolById(profile.schoolId).then(setSchool);
  }, [profile]);

  return (
    <>
      <AppHeader title={t.help.title} backHref="/profile" showAvatar />
      <div className="w-full space-y-8 p-4 pb-8 sm:p-6 lg:p-8">
        <p className="text-sm text-sub">{t.help.subtitle}</p>

        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-ink">{t.help.faqTitle}</h2>
          <Accordion type="single" collapsible className="rounded-lg border border-line/60 bg-card px-4">
            {t.help.faqs.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger className="text-left text-sm font-medium text-ink">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-sub">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-ink">{t.help.contactTitle}</h2>
          <div className="divide-y divide-line rounded-lg border border-line/60 bg-card px-4">
            <div className="flex items-center gap-3 py-3">
              <Phone className="size-4 text-sub" />
              <div>
                <p className="text-xs text-sub">{t.help.contactPhoneLabel}</p>
                <p className="text-sm font-medium text-ink">{school?.contactPhone ?? "…"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-3">
              <Mail className="size-4 text-sub" />
              <div>
                <p className="text-xs text-sub">{t.help.contactEmailLabel}</p>
                <p className="text-sm font-medium text-ink">{school?.contactEmail ?? "…"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-3">
              <MessageCircle className="size-4 text-sub" />
              <div>
                <p className="text-xs text-sub">{t.help.contactHoursLabel}</p>
                <p className="text-sm font-medium text-ink">{t.help.contactHoursValue}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-ink">{t.help.chatTitle}</h2>
          <div className="flex items-center gap-3 rounded-lg border border-line/60 bg-muted p-4 opacity-80">
            <MessageCircle className="size-5 text-sub" />
            <p className="text-sm text-sub">{t.help.chatComingSoon}</p>
          </div>
        </section>
      </div>
    </>
  );
}
