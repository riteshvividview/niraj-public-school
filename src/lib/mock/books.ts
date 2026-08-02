import type { Book } from "@/types";
import { MOCK_SCHOOL } from "./school";

const SEED_TIMESTAMP = "2026-06-01T00:00:00.000Z";
const schoolId = MOCK_SCHOOL.id;

function book(id: string, classLevelId: string, title: string, subject: string, price: number): Book {
  return {
    id,
    schoolId,
    classLevelId,
    title,
    subject,
    price,
    coverImageUrl: "/essentials/books.jpg",
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  };
}

export const MOCK_BOOKS: Book[] = [
  // Grade 1
  book("book-1-1", "class-1", "Marigold — English Reader", "English", 165),
  book("book-1-2", "class-1", "Rimjhim — Hindi Reader", "Hindi", 150),
  book("book-1-3", "class-1", "Math Magic", "Mathematics", 175),
  book("book-1-4", "class-1", "Looking Around — EVS", "Environmental Studies", 160),
  book("book-1-5", "class-1", "My Book of Good Habits", "Value Education", 120),

  // Grade 3
  book("book-3-1", "class-3", "Marigold — English Reader", "English", 185),
  book("book-3-2", "class-3", "Rimjhim — Hindi Reader", "Hindi", 170),
  book("book-3-3", "class-3", "Math Magic", "Mathematics", 195),
  book("book-3-4", "class-3", "Looking Around — EVS", "Environmental Studies", 180),
  book("book-3-5", "class-3", "Telugu Vachakam", "Telugu", 150),
  book("book-3-6", "class-3", "My Book of Good Habits", "Value Education", 120),

  // Grade 6
  book("book-6-1", "class-6", "Honeysuckle — English Reader", "English", 210),
  book("book-6-2", "class-6", "Vasant — Hindi Reader", "Hindi", 190),
  book("book-6-3", "class-6", "New Learning Composite Mathematics", "Mathematics", 320),
  book("book-6-4", "class-6", "Together with Science", "Science", 285),
  book("book-6-5", "class-6", "Our Pasts — Social Studies", "Social Studies", 260),
  book("book-6-6", "class-6", "Computer Applications", "Computer Science", 240),
  book("book-6-7", "class-6", "Telugu Vachakam", "Telugu", 160),

  // Grade 9
  book("book-9-1", "class-9", "Beehive — English Reader", "English", 230),
  book("book-9-2", "class-9", "Kshitij — Hindi Reader", "Hindi", 200),
  book("book-9-3", "class-9", "Mathematics for Class 9", "Mathematics", 345),
  book("book-9-4", "class-9", "Science for Class 9", "Science", 310),
  book("book-9-5", "class-9", "Contemporary India — Social Studies", "Social Studies", 275),
  book("book-9-6", "class-9", "Information Technology", "Computer Science", 265),
];
