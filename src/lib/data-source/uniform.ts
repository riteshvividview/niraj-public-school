import type { UniformItem } from "@/types";
import { MOCK_UNIFORM_ITEMS } from "@/lib/mock/uniform";
import { withDelay } from "./_internal";

export async function getUniformItemsByClass(
  schoolId: string,
  classLevelId: string,
): Promise<UniformItem[]> {
  return withDelay(
    MOCK_UNIFORM_ITEMS.filter((item) => item.schoolId === schoolId && item.classLevelId === classLevelId),
  );
}

export async function getUniformItemById(id: string): Promise<UniformItem | null> {
  return withDelay(MOCK_UNIFORM_ITEMS.find((item) => item.id === id) ?? null);
}
