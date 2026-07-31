"use client";

import { Globe } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTranslation } from "@/i18n/context";
import { SUPPORTED_LANGUAGES } from "@/i18n/languages";
import type { LanguageCode } from "@/types/language";
import { cn } from "@/lib/utils";

/**
 * The list of language options as its own piece, so Phase 3's full-screen
 * first-run selector can reuse it directly instead of duplicating markup.
 */
export function LanguageOptionList({
  onSelect,
  className,
}: {
  onSelect?: (language: LanguageCode) => void;
  className?: string;
}) {
  const { language, setLanguage } = useTranslation();

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {SUPPORTED_LANGUAGES.map((option) => {
        const isActive = option.code === language;
        return (
          <button
            key={option.code}
            type="button"
            onClick={() => {
              setLanguage(option.code);
              onSelect?.(option.code);
            }}
            className={cn(
              "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors",
              isActive ? "border-brand bg-section-workspace-bg" : "border-line hover:bg-muted",
            )}
          >
            <span>
              <span className="block font-heading text-base font-semibold text-ink">
                {option.nativeName}
              </span>
              <span className="block text-sm text-sub">{option.englishName}</span>
            </span>
            {isActive ? <span className="size-2.5 shrink-0 rounded-full bg-brand" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Compact trigger + sheet, for use inside the app (e.g. AppHeader, Profile). */
export function LanguageSwitcher() {
  const { language, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = SUPPORTED_LANGUAGES.find((option) => option.code === language);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Globe className="size-4" />
          {current?.nativeName ?? language}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{t.language}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4">
          <LanguageOptionList onSelect={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
