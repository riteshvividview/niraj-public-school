import type { AcademicLanguage, Book, BookContentItem, Elective, Stream } from "@/types";
import { payloadCreate, payloadDelete, payloadFind, payloadFindById, payloadUpdate } from "./payload-rest";

interface PayloadBookContent {
  id?: string;
  section: BookContentItem["section"];
  subject?: string | null;
  name: string;
  publisher?: string | null;
  detail?: string | null;
  quantity: number;
  starred?: boolean | null;
}

interface PayloadBookDoc {
  id: string;
  school: string;
  classLevel: string;
  title: string;
  subject: string;
  author?: string | null;
  price: number;
  coverImageUrl?: string | null;
  language?: AcademicLanguage | null;
  stream?: Stream | null;
  elective?: Elective | null;
  contents?: PayloadBookContent[] | null;
  createdAt: string;
  updatedAt: string;
}

function toBook(doc: PayloadBookDoc): Book {
  return {
    id: doc.id,
    schoolId: doc.school,
    classLevelId: doc.classLevel,
    title: doc.title,
    subject: doc.subject,
    author: doc.author ?? undefined,
    price: doc.price,
    coverImageUrl: doc.coverImageUrl ?? null,
    language: doc.language ?? undefined,
    stream: doc.stream ?? undefined,
    elective: doc.elective ?? undefined,
    contents: (doc.contents ?? []).map((c, i) => ({
      id: c.id ?? String(i),
      section: c.section,
      subject: c.subject ?? undefined,
      name: c.name,
      publisher: c.publisher ?? undefined,
      detail: c.detail ?? undefined,
      quantity: c.quantity,
      starred: Boolean(c.starred),
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface StudentBookVariant {
  language?: AcademicLanguage;
  stream?: Stream;
  elective?: Elective;
}

/**
 * A book row's variant fields (language/stream/elective) are `null`/unset
 * when they don't apply to a class — e.g. Class 2 only varies by language,
 * so its rows leave stream/elective unset and match every student. Filtered
 * client-side rather than via a Payload `where[or]` query since the result
 * set per (school, classLevel) is tiny (a handful of rows at most).
 */
export async function getBooksByClass(
  schoolId: string,
  classLevelId: string,
  variant: StudentBookVariant = {},
): Promise<Book[]> {
  const docs = await payloadFind<PayloadBookDoc>("books", { school: schoolId, classLevel: classLevelId });
  const matches = (docValue: string | null | undefined, studentValue: string | undefined) =>
    docValue == null || studentValue == null || docValue === studentValue;
  return docs
    .filter(
      (doc) =>
        matches(doc.language, variant.language) &&
        matches(doc.stream, variant.stream) &&
        matches(doc.elective, variant.elective),
    )
    .map(toBook);
}

/** Console — Stock tab (whole-school view, unlike getBooksByClass's per-class scoping). */
export async function getBooksBySchool(schoolId: string): Promise<Book[]> {
  const docs = await payloadFind<PayloadBookDoc>("books", { school: schoolId });
  return docs.map(toBook);
}

export async function getBookById(id: string): Promise<Book | null> {
  const doc = await payloadFindById<PayloadBookDoc>("books", id);
  return doc ? toBook(doc) : null;
}

export interface BookInput {
  schoolId: string;
  classLevelId: string;
  title: string;
  subject: string;
  price: number;
  language?: AcademicLanguage;
  stream?: Stream;
  elective?: Elective;
}

/** Console — Catalogue Manager. */
export async function createBook(input: BookInput): Promise<Book> {
  const doc = await payloadCreate<PayloadBookDoc>("books", {
    school: input.schoolId,
    classLevel: input.classLevelId,
    title: input.title,
    subject: input.subject,
    price: input.price,
    language: input.language,
    stream: input.stream,
    elective: input.elective,
  });
  return toBook(doc);
}

export async function updateBook(id: string, patch: Partial<BookInput>): Promise<Book | null> {
  const doc = await payloadUpdate<PayloadBookDoc>("books", id, {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.subject !== undefined ? { subject: patch.subject } : {}),
    ...(patch.price !== undefined ? { price: patch.price } : {}),
    ...(patch.language !== undefined ? { language: patch.language } : {}),
    ...(patch.stream !== undefined ? { stream: patch.stream } : {}),
    ...(patch.elective !== undefined ? { elective: patch.elective } : {}),
  });
  return doc ? toBook(doc) : null;
}

/**
 * Console — Catalogue Manager. Replaces what is listed inside a book set (no
 * prices — only the set is priced). Orders already placed keep the list they
 * were placed with; this only affects orders from now on.
 */
export async function updateBookContents(id: string, contents: Omit<BookContentItem, "id">[]): Promise<Book | null> {
  const doc = await payloadUpdate<PayloadBookDoc>("books", id, {
    contents: contents.map((c) => ({
      section: c.section,
      subject: c.subject || null,
      name: c.name,
      publisher: c.publisher || null,
      detail: c.detail || null,
      quantity: c.quantity,
      starred: c.starred,
    })),
  });
  return doc ? toBook(doc) : null;
}

export async function deleteBook(id: string): Promise<void> {
  await payloadDelete("books", id);
}
