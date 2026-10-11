import type { AcademicLanguage, Elective, Stream } from "./user-profile";

/** Where an item inside a book set comes from. */
export type BookContentSection = "textbook" | "notebook" | "stationery";

/**
 * One thing inside a book set (a textbook, a notebook, a stationery item).
 * Deliberately has NO price — only the whole set is priced.
 */
export interface BookContentItem {
  id: string;
  section: BookContentSection;
  /** Subject or group, e.g. "Physics", "Math". */
  subject?: string;
  name: string;
  publisher?: string;
  /** Extra info, e.g. "200 Single Ruled". */
  detail?: string;
  quantity: number;
  /** Star-marked in the school list ("given in class"). */
  starred: boolean;
}

/** Mirrors the future Payload `books` collection. */
export interface Book {
  id: string;
  schoolId: string;
  classLevelId: string;
  title: string;
  subject: string;
  author?: string;
  /** Price in INR. */
  price: number;
  coverImageUrl: string | null;
  /** Variant fields — unset means "applies to every student in this class". See getBooksByClass. */
  language?: AcademicLanguage;
  stream?: Stream;
  elective?: Elective;
  /** What is inside this set — staff-facing only, never shown to parents. */
  contents?: BookContentItem[];
  createdAt: string;
  updatedAt: string;
}
