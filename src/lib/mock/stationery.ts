import type { StationeryItem } from "@/types";
import { MOCK_SCHOOL } from "./school";

const SEED_TIMESTAMP = "2026-06-01T00:00:00.000Z";
const schoolId = MOCK_SCHOOL.id;

function stationeryItem(
  id: string,
  classLevelId: string,
  name: string,
  quantityLabel: string,
  price: number,
): StationeryItem {
  return {
    id,
    schoolId,
    classLevelId,
    name,
    quantityLabel,
    price,
    imageUrl: null,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  };
}

const CLASS_LEVEL_IDS = ["class-1", "class-3", "class-6", "class-9"];

export const MOCK_STATIONERY_ITEMS: StationeryItem[] = CLASS_LEVEL_IDS.flatMap((classLevelId) => [
  stationeryItem(`stationery-${classLevelId}-notebooks`, classLevelId, "Ruled Notebooks", "Set of 5", 175),
  stationeryItem(`stationery-${classLevelId}-geometry`, classLevelId, "Geometry Box", "1 box", 145),
  stationeryItem(`stationery-${classLevelId}-bag`, classLevelId, "School Bag", "1 bag", 950),
  stationeryItem(`stationery-${classLevelId}-bottle`, classLevelId, "Water Bottle", "1 bottle", 220),
  stationeryItem(`stationery-${classLevelId}-pencil-box`, classLevelId, "Pencil Box Set", "1 set", 190),
  stationeryItem(`stationery-${classLevelId}-art-kit`, classLevelId, "Art & Craft Kit", "1 kit", 260),
]);
