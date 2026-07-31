import type { LanguageCode } from "@/types/language";
import type { Dictionary } from "../types";
import en from "./en";
import hi from "./hi";
import te from "./te";

export const dictionaries: Record<LanguageCode, Dictionary> = { en, hi, te };
