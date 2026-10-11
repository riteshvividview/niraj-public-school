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
  /** A new-admission item: required for new students (part of their full set), optional for existing ones. Has no class of its own — classLevelId is "". */
  newAdmission?: boolean;
  /** Class sort-order range a new-admission item applies to (unset = every class). */
  newAdmissionFromOrder?: number;
  newAdmissionToOrder?: number;
  /** Hidden from every list, kept for past orders. */
  retired?: boolean;
  createdAt: string;
  updatedAt: string;
}
