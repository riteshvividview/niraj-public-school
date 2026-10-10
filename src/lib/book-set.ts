import { secondLanguageOf } from "@/lib/academic-language";
import type { AcademicLanguage, BookSelection, Elective, Stream, UserProfile } from "@/types";

/**
 * Which book set a student is assigned. The school records a student's
 * second language / stream / elective (roster import or console); a student
 * can no longer switch them on Essentials → Books — they raise a request
 * (see book-change-requests). Unset = "not recorded yet" and is not enforced.
 */
export interface AssignedBookSet {
  secondLanguage?: AcademicLanguage;
  stream?: Stream;
  elective?: Elective;
}

type ProfileLike = Pick<UserProfile, "academicLanguage" | "languageLevel" | "stream" | "elective">;

export function assignedBookSetOf(profile: ProfileLike): AssignedBookSet {
  return {
    secondLanguage: secondLanguageOf(profile),
    stream: profile.stream ?? undefined,
    elective: profile.elective ?? undefined,
  };
}

interface BookVariantLike {
  language?: string | null;
  stream?: string | null;
  elective?: string | null;
}

/**
 * Does this catalogue book belong to the student's assigned set? A book with
 * no variant value applies to everyone; a student with no recorded value
 * can't be checked on that attribute.
 */
export function bookMatchesAssignedSet(book: BookVariantLike, set: AssignedBookSet): boolean {
  const ok = (bookValue: string | null | undefined, studentValue: string | undefined) =>
    bookValue == null || studentValue == null || bookValue === studentValue;
  return ok(book.language, set.secondLanguage) && ok(book.stream, set.stream) && ok(book.elective, set.elective);
}

export function isEmptySelection(selection: BookSelection): boolean {
  return !selection.secondLanguage && !selection.stream && !selection.elective;
}
