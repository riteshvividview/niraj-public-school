import type { UniformItem } from "@/types";
import { MOCK_SCHOOL } from "./school";

const SEED_TIMESTAMP = "2026-06-01T00:00:00.000Z";
const schoolId = MOCK_SCHOOL.id;

/** Exported for the console's Catalogue Manager (Phase 8), which only collects a base price. */
export function sizesFor(classLevelId: string, basePrice: number) {
  const smallClasses = ["class-1", "class-3"];
  const sizes = smallClasses.includes(classLevelId)
    ? ["18", "20", "22", "24", "26"]
    : ["28", "30", "32", "34", "36", "38"];
  return sizes.map((size, index) => ({
    size,
    price: basePrice + index * 15,
  }));
}

function uniformItem(
  id: string,
  classLevelId: string,
  name: string,
  category: "uniform" | "kit",
  description: string,
  basePrice: number,
): UniformItem {
  return {
    id,
    schoolId,
    classLevelId,
    name,
    category,
    description,
    imageUrl: null,
    sizeOptions: sizesFor(classLevelId, basePrice),
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  };
}

const CLASS_LEVEL_IDS = ["class-1", "class-3", "class-6", "class-9"];

export const MOCK_UNIFORM_ITEMS: UniformItem[] = CLASS_LEVEL_IDS.flatMap((classLevelId) => [
  uniformItem(
    `uniform-${classLevelId}-shirt`,
    classLevelId,
    "Summer Shirt (Set of 2)",
    "uniform",
    "Sky-blue half-sleeve shirt with school monogram, set of two.",
    620,
  ),
  uniformItem(
    `uniform-${classLevelId}-bottom`,
    classLevelId,
    "Summer Trousers / Skirt (Set of 2)",
    "uniform",
    "Navy-blue trousers or pleated skirt, set of two.",
    540,
  ),
  uniformItem(
    `uniform-${classLevelId}-sweater`,
    classLevelId,
    "Winter Sweater",
    "uniform",
    "Maroon V-neck pullover with school piping.",
    690,
  ),
  uniformItem(
    `uniform-${classLevelId}-pt`,
    classLevelId,
    "PT Kit (T-Shirt + Track Pants)",
    "kit",
    "House-colour PT t-shirt and navy track pants for sports periods.",
    560,
  ),
  uniformItem(
    `uniform-${classLevelId}-tie-belt`,
    classLevelId,
    "Tie & Belt Set",
    "kit",
    "School-crest tie and adjustable belt.",
    210,
  ),
]);
