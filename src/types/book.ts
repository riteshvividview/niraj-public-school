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
  createdAt: string;
  updatedAt: string;
}
