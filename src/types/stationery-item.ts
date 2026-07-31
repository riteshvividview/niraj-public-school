/** Mirrors the future Payload `stationery-items` collection. */
export interface StationeryItem {
  id: string;
  schoolId: string;
  classLevelId: string;
  name: string;
  /** Human-readable quantity description, e.g. "5-subject notebook set". */
  quantityLabel: string;
  /** Price in INR. */
  price: number;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
