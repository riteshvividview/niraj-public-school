import type { AcademicLanguage } from "@/types";

/** The only two academic languages the school offers — always each other's opposite. Shared between the Students console UI and its data-source query builder so both agree on what "first"/"second" language means. */
export function oppositeLanguage(language: AcademicLanguage): AcademicLanguage {
  return language === "hindi" ? "telugu" : "hindi";
}
