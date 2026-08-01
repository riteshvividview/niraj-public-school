import type { LanguageCode } from "@/types/language";

const CURRENCY_LOCALE: Record<LanguageCode, string> = {
  en: "en-IN",
  hi: "hi-IN",
  te: "te-IN",
};

export function formatCurrencyINR(amount: number, language: LanguageCode = "en"): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE[language], {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(isoDate: string, language: LanguageCode = "en"): string {
  return new Intl.DateTimeFormat(CURRENCY_LOCALE[language], {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate));
}
