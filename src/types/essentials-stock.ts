/** Mirrors the Payload `essentials-stock` collection. Staff console only — never read by the student app. */
export interface EssentialsStockRow {
  id: string;
  schoolId: string;
  kind: "book" | "uniform";
  refId: string;
  /** "" for books; a uniform item's size string for uniform. */
  variantKey: string;
  quantityOnHand: number;
  lowStockThreshold: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
