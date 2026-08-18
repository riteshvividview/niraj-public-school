import type { AcademicLanguage, Book, Elective, Stream } from "@/types";
import { MOCK_SCHOOL } from "./school";

const SEED_TIMESTAMP = "2026-06-01T00:00:00.000Z";
const schoolId = MOCK_SCHOOL.id;

/**
 * The school's real book price sheet gives one lump "book set" fee per
 * class + language(+stream+elective) combination, not itemized per-title
 * pricing — so each combination becomes a single priced entry rather than a
 * list of individually priced books.
 */
function bookSet(
  id: string,
  classLevelId: string,
  price: number,
  variant: { language: AcademicLanguage; stream?: Stream; elective?: Elective },
): Book {
  return {
    id,
    schoolId,
    classLevelId,
    title: "Books & Fee Set",
    subject: "All Subjects",
    price,
    coverImageUrl: null,
    language: variant.language,
    stream: variant.stream,
    elective: variant.elective,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  };
}

// Class 2 — varies only by language (BOOKS Fee LIST FOR 26-27.xlsx).
export const CLASS_2_BOOKS: Book[] = [
  bookSet("book-class2-hindi", "class-2", 13245, { language: "hindi" }),
  bookSet("book-class2-telugu", "class-2", 14395, { language: "telugu" }),
];

// Class 8 — varies by stream (Science/Economics) x language x elective.
export const CLASS_8_BOOKS: Book[] = [
  bookSet("book-class8-eco-telugu-ena", "class-8", 13795, { language: "telugu", stream: "economics", elective: "ena" }),
  bookSet("book-class8-eco-telugu-homeScience", "class-8", 13555, { language: "telugu", stream: "economics", elective: "homeScience" }),
  bookSet("book-class8-eco-telugu-roboticsAI", "class-8", 14040, { language: "telugu", stream: "economics", elective: "roboticsAI" }),
  bookSet("book-class8-eco-hindi-ena", "class-8", 13525, { language: "hindi", stream: "economics", elective: "ena" }),
  bookSet("book-class8-eco-hindi-homeScience", "class-8", 13540, { language: "hindi", stream: "economics", elective: "homeScience" }),
  bookSet("book-class8-eco-hindi-roboticsAI", "class-8", 13770, { language: "hindi", stream: "economics", elective: "roboticsAI" }),
  bookSet("book-class8-sci-telugu-ena", "class-8", 15845, { language: "telugu", stream: "science", elective: "ena" }),
  bookSet("book-class8-sci-telugu-homeScience", "class-8", 15860, { language: "telugu", stream: "science", elective: "homeScience" }),
  bookSet("book-class8-sci-telugu-roboticsAI", "class-8", 16090, { language: "telugu", stream: "science", elective: "roboticsAI" }),
  bookSet("book-class8-sci-hindi-ena", "class-8", 15575, { language: "hindi", stream: "science", elective: "ena" }),
  bookSet("book-class8-sci-hindi-homeScience", "class-8", 15590, { language: "hindi", stream: "science", elective: "homeScience" }),
  bookSet("book-class8-sci-hindi-roboticsAI", "class-8", 15805, { language: "hindi", stream: "science", elective: "roboticsAI" }),
];

export const ALL_BOOKS: Book[] = [...CLASS_2_BOOKS, ...CLASS_8_BOOKS];
