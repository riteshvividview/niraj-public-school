import type { Gender } from "./user-profile";

export interface UniformSizeOption {
  size: string;
  /** Price in INR for this size (kept per-size since larger sizes can cost more). */
  price: number;
}

/** Mirrors the future Payload `uniform-items` collection. */
export interface UniformItem {
  id: string;
  schoolId: string;
  classLevelId: string;
  name: string;
  category: "uniform" | "kit";
  description?: string;
  imageUrl: string | null;
  sizeOptions: UniformSizeOption[];
  /** Unset = unisex item. See getUniformItemsByClass. */
  gender?: Gender;
  createdAt: string;
  updatedAt: string;
}
