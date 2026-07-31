import type { LanguageCode } from "@/types/language";

export interface LanguageOption {
  code: LanguageCode;
  /** Name written in that language's own script, shown in the selector. */
  nativeName: string;
  englishName: string;
}

/** Add a new language here + a matching dictionary file — nothing else changes. */
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", nativeName: "English", englishName: "English" },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi" },
  { code: "te", nativeName: "తెలుగు", englishName: "Telugu" },
];
