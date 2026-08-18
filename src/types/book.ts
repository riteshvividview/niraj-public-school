import type { AcademicLanguage, Elective, Stream } from "./user-profile";

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
  createdAt: string;
  updatedAt: string;
}
