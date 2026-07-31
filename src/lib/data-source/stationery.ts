import type { StationeryItem } from "@/types";
import { MOCK_STATIONERY_ITEMS } from "@/lib/mock/stationery";
import { withDelay } from "./_internal";

export async function getStationeryItemsByClass(
  schoolId: string,
  classLevelId: string,
): Promise<StationeryItem[]> {
  return withDelay(
    MOCK_STATIONERY_ITEMS.filter(
      (item) => item.schoolId === schoolId && item.classLevelId === classLevelId,
    ),
  );
}

export async function getStationeryItemById(id: string): Promise<StationeryItem | null> {
  return withDelay(MOCK_STATIONERY_ITEMS.find((item) => item.id === id) ?? null);
}
