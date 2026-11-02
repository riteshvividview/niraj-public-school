import type { CartItem, NewAdmissionStatus } from "@/types";

/**
 * The first order for a class must include BOTH the books and the uniform. Given the student's status and
 * the cart, what is still missing? (The payment step on the server enforces the same rule.)
 * An unknown status (still loading / failed) never blocks — the server has the final say.
 */
export function missingForFirstOrder(status: NewAdmissionStatus | undefined, items: CartItem[]): { books: boolean; uniform: boolean } {
  const hasBooks = items.some((item) => item.kind === "book");
  const hasUniform = items.some((item) => item.kind === "uniform");
  if (!status || (!hasBooks && !hasUniform)) return { books: false, uniform: false };
  return {
    books: status.classHasBooks === true && status.booksDone === false && !hasBooks,
    uniform: status.classHasUniform === true && status.uniformDone === false && !hasUniform,
  };
}
