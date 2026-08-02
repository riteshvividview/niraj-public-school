"use client";

import { Globe } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTranslation } from "@/i18n/context";
import { SUPPORTED_LANGUAGES } from "@/i18n/languages";
import { useIsDesktop } from "@/lib/use-media-query";
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
    <div className={cn("flex flex-col gap-3", className)}>
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
              "flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all sm:px-5 sm:py-4",
              isActive
                ? "border-brand bg-section-workspace-bg shadow-sm"
                : "border-line hover:border-brand/40 hover:bg-muted",
            )}
          >
            <span>
              <span className="block font-heading text-base font-semibold text-ink sm:text-lg">
                {option.nativeName}
              </span>
              <span className="block text-xs text-sub sm:text-sm">{option.englishName}</span>
            </span>
            {isActive ? <span className="size-2.5 shrink-0 rounded-full bg-brand sm:size-3" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact trigger, for use inside the app (e.g. AppHeader, Profile). Opens
 * as a bottom sheet on mobile (standard mobile pattern) but a centered
 * dialog on desktop (md+) — a full-width drawer sliding up from the bottom
 * of a wide desktop viewport reads as a mobile-only pattern out of place
 * there.
 */
export function LanguageSwitcher() {
  const { language, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const current = SUPPORTED_LANGUAGES.find((option) => option.code === language);

  const trigger = (
    <Button variant="outline" size="sm" className="gap-1.5">
      <Globe className="size-4" />
      {current?.nativeName ?? language}
    </Button>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.language}</DialogTitle>
          </DialogHeader>
          <LanguageOptionList onSelect={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
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
