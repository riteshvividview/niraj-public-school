import type { Book } from "@/types";
import { MOCK_BOOKS } from "@/lib/mock/books";
import { createRuntimeCollection, withDelay } from "./_internal";

const store = createRuntimeCollection<Book>("nps-runtime-books", MOCK_BOOKS);

export async function getBooksByClass(schoolId: string, classLevelId: string): Promise<Book[]> {
  return withDelay(
    store.all().filter((book) => book.schoolId === schoolId && book.classLevelId === classLevelId),
  );
}

export async function getBookById(id: string): Promise<Book | null> {
  return withDelay(store.find(id) ?? null);
}

export interface BookInput {
  schoolId: string;
  classLevelId: string;
  title: string;
  subject: string;
  price: number;
}

/** Console — Catalogue Manager. In Phase 9 this becomes a write to the Payload `books` collection. */
export async function createBook(input: BookInput): Promise<Book> {
  const now = new Date().toISOString();
  const book: Book = { id: `book-${Date.now()}`, coverImageUrl: null, createdAt: now, updatedAt: now, ...input };
  store.add(book);
  return withDelay(book);
}

export async function updateBook(id: string, patch: Partial<BookInput>): Promise<Book | null> {
  return withDelay(store.update(id, { ...patch, updatedAt: new Date().toISOString() }));
}

export async function deleteBook(id: string): Promise<void> {
  store.remove(id);
  return withDelay(undefined);
}
