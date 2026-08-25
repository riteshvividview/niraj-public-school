import type { EssentialsStockRow } from "@/types";
import { payloadCreate, payloadFind, payloadUpdate } from "./payload-rest";

interface PayloadEssentialsStockDoc {
  id: string;
  school: string;
  kind: "book" | "uniform";
  refId: string;
  variantKey: string;
  quantityOnHand: number;
  lowStockThreshold: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

function toStockRow(doc: PayloadEssentialsStockDoc): EssentialsStockRow {
  return {
    id: doc.id,
    schoolId: doc.school,
    kind: doc.kind,
    refId: doc.refId,
    variantKey: doc.variantKey,
    quantityOnHand: doc.quantityOnHand,
    lowStockThreshold: doc.lowStockThreshold,
    notes: doc.notes ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** Console — Stock tab. Whole-school; the tab filters client-side (kind/class/search). */
export async function getEssentialsStockBySchool(schoolId: string): Promise<EssentialsStockRow[]> {
  const docs = await payloadFind<PayloadEssentialsStockDoc>("essentials-stock", { school: schoolId });
  return docs.map(toStockRow);
}

export interface EssentialsStockKey {
  schoolId: string;
  kind: "book" | "uniform";
  refId: string;
  /** "" for books. */
  variantKey: string;
}

/**
 * Find-or-create by (school, kind, refId, variantKey), then set the given
 * fields — used by the Stock tab's inline "set stock" inputs, and by a
 * product that isn't tracked yet ("Start tracking").
 */
export async function upsertEssentialsStock(
  key: EssentialsStockKey,
  patch: { quantityOnHand?: number; lowStockThreshold?: number; notes?: string },
): Promise<EssentialsStockRow> {
  const existing = await payloadFind<PayloadEssentialsStockDoc>("essentials-stock", {
    school: key.schoolId,
    kind: key.kind,
    refId: key.refId,
    variantKey: key.variantKey,
  });
  const row = existing[0];

  if (row) {
    const doc = await payloadUpdate<PayloadEssentialsStockDoc>("essentials-stock", row.id, patch);
    return toStockRow(doc);
  }

  const doc = await payloadCreate<PayloadEssentialsStockDoc>("essentials-stock", {
    school: key.schoolId,
    kind: key.kind,
    refId: key.refId,
    variantKey: key.variantKey,
    quantityOnHand: patch.quantityOnHand ?? 0,
    lowStockThreshold: patch.lowStockThreshold ?? 5,
    notes: patch.notes,
  });
  return toStockRow(doc);
}

/** Relative +/- adjustment (e.g. "received 20 more") — reads current value first since Payload PATCH isn't atomic-increment. */
export async function adjustEssentialsStock(id: string, currentQuantity: number, delta: number): Promise<EssentialsStockRow> {
  const doc = await payloadUpdate<PayloadEssentialsStockDoc>("essentials-stock", id, {
    quantityOnHand: currentQuantity + delta,
  });
  return toStockRow(doc);
}
