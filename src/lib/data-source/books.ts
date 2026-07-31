import type { Book } from "@/types";
import { payloadCreate, payloadDelete, payloadFind, payloadFindById, payloadUpdate } from "./payload-rest";

interface PayloadBookDoc {
  id: string;
  school: string;
  classLevel: string;
  title: string;
  subject: string;
  author?: string | null;
  price: number;
  coverImageUrl?: string | null;
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
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function getBooksByClass(schoolId: string, classLevelId: string): Promise<Book[]> {
  const docs = await payloadFind<PayloadBookDoc>("books", { school: schoolId, classLevel: classLevelId });
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
}

/** Console — Catalogue Manager. */
export async function createBook(input: BookInput): Promise<Book> {
  const doc = await payloadCreate<PayloadBookDoc>("books", {
    school: input.schoolId,
    classLevel: input.classLevelId,
    title: input.title,
    subject: input.subject,
    price: input.price,
  });
  return toBook(doc);
}

export async function updateBook(id: string, patch: Partial<BookInput>): Promise<Book | null> {
  const doc = await payloadUpdate<PayloadBookDoc>("books", id, {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.subject !== undefined ? { subject: patch.subject } : {}),
    ...(patch.price !== undefined ? { price: patch.price } : {}),
  });
  return doc ? toBook(doc) : null;
}

export async function deleteBook(id: string): Promise<void> {
  await payloadDelete("books", id);
}
