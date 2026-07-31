import type { StationeryItem } from "@/types";
import { payloadCreate, payloadDelete, payloadFind, payloadFindById, payloadUpdate } from "./payload-rest";

interface PayloadStationeryDoc {
  id: string;
  school: string;
  classLevel: string;
  name: string;
  quantityLabel: string;
  price: number;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

function toStationeryItem(doc: PayloadStationeryDoc): StationeryItem {
  return {
    id: doc.id,
    schoolId: doc.school,
    classLevelId: doc.classLevel,
    name: doc.name,
    quantityLabel: doc.quantityLabel,
    price: doc.price,
    imageUrl: doc.imageUrl ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function getStationeryItemsByClass(
  schoolId: string,
  classLevelId: string,
): Promise<StationeryItem[]> {
  const docs = await payloadFind<PayloadStationeryDoc>("stationery-items", {
    school: schoolId,
    classLevel: classLevelId,
  });
  return docs.map(toStationeryItem);
}

export async function getStationeryItemById(id: string): Promise<StationeryItem | null> {
  const doc = await payloadFindById<PayloadStationeryDoc>("stationery-items", id);
  return doc ? toStationeryItem(doc) : null;
}

export interface StationeryItemInput {
  schoolId: string;
  classLevelId: string;
  name: string;
  quantityLabel: string;
  price: number;
}

/** Console — Catalogue Manager. */
export async function createStationeryItem(input: StationeryItemInput): Promise<StationeryItem> {
  const doc = await payloadCreate<PayloadStationeryDoc>("stationery-items", {
    school: input.schoolId,
    classLevel: input.classLevelId,
    name: input.name,
    quantityLabel: input.quantityLabel,
    price: input.price,
  });
  return toStationeryItem(doc);
}

export async function updateStationeryItem(
  id: string,
  patch: Partial<StationeryItemInput>,
): Promise<StationeryItem | null> {
  const doc = await payloadUpdate<PayloadStationeryDoc>("stationery-items", id, {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.quantityLabel !== undefined ? { quantityLabel: patch.quantityLabel } : {}),
    ...(patch.price !== undefined ? { price: patch.price } : {}),
  });
  return doc ? toStationeryItem(doc) : null;
}

export async function deleteStationeryItem(id: string): Promise<void> {
  await payloadDelete("stationery-items", id);
}
