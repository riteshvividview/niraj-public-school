import type { AcademicLanguage, UserProfile } from "@/types";

/** The only two academic languages the school offers — always each other's opposite. Shared between the Students console UI and its data-source query builder so both agree on what "first"/"second" language means. */
export function oppositeLanguage(language: AcademicLanguage): AcademicLanguage {
  return language === "hindi" ? "telugu" : "hindi";
}

/**
 * `academicLanguage` alone is NOT always "the second language" — it only is
 * when `languageLevel === "second"`; otherwise it's the first language and
 * the second is its opposite. First/second are always opposites of each
 * other, so the one the roster didn't explicitly record is fully determined
 * by the one it did. A student with no `academicLanguage` at all has
 * neither (nothing to derive from). Shared by the Students console (roster
 * display/filters) and the student-facing Books flow (auto-selecting the
 * stored 2nd language) so both agree on what "second language" means.
 */
export function firstLanguageOf(
  student: Pick<UserProfile, "academicLanguage" | "languageLevel">,
): AcademicLanguage | undefined {
  if (!student.academicLanguage) return undefined;
  return student.languageLevel === "second" ? oppositeLanguage(student.academicLanguage) : student.academicLanguage;
}
export function secondLanguageOf(
  student: Pick<UserProfile, "academicLanguage" | "languageLevel">,
): AcademicLanguage | undefined {
  if (!student.academicLanguage) return undefined;
  return student.languageLevel === "second" ? student.academicLanguage : oppositeLanguage(student.academicLanguage);
}
