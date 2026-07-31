import type { Book } from "@/types";
import { MOCK_BOOKS } from "@/lib/mock/books";
import { withDelay } from "./_internal";

export async function getBooksByClass(schoolId: string, classLevelId: string): Promise<Book[]> {
  return withDelay(
    MOCK_BOOKS.filter((book) => book.schoolId === schoolId && book.classLevelId === classLevelId),
  );
}

export async function getBookById(id: string): Promise<Book | null> {
  return withDelay(MOCK_BOOKS.find((book) => book.id === id) ?? null);
}
