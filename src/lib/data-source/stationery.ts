import type { StationeryItem } from "@/types";
import { MOCK_STATIONERY_ITEMS } from "@/lib/mock/stationery";
import { createRuntimeCollection, withDelay } from "./_internal";

const store = createRuntimeCollection<StationeryItem>("nps-runtime-stationery", MOCK_STATIONERY_ITEMS);

export async function getStationeryItemsByClass(
  schoolId: string,
  classLevelId: string,
): Promise<StationeryItem[]> {
  return withDelay(
    store.all().filter((item) => item.schoolId === schoolId && item.classLevelId === classLevelId),
  );
}

export async function getStationeryItemById(id: string): Promise<StationeryItem | null> {
  return withDelay(store.find(id) ?? null);
}

export interface StationeryItemInput {
  schoolId: string;
  classLevelId: string;
  name: string;
  quantityLabel: string;
  price: number;
}

/** Console — Catalogue Manager. In Phase 9 this becomes a write to the Payload `stationery-items` collection. */
export async function createStationeryItem(input: StationeryItemInput): Promise<StationeryItem> {
  const now = new Date().toISOString();
  const item: StationeryItem = {
    id: `stationery-${Date.now()}`,
    imageUrl: null,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  store.add(item);
  return withDelay(item);
}

export async function updateStationeryItem(
  id: string,
  patch: Partial<StationeryItemInput>,
): Promise<StationeryItem | null> {
  return withDelay(store.update(id, { ...patch, updatedAt: new Date().toISOString() }));
}

export async function deleteStationeryItem(id: string): Promise<void> {
  store.remove(id);
  return withDelay(undefined);
}
