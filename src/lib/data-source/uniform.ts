import type { UniformItem } from "@/types";
import { MOCK_UNIFORM_ITEMS, sizesFor } from "@/lib/mock/uniform";
import { createRuntimeCollection, withDelay } from "./_internal";

const store = createRuntimeCollection<UniformItem>("nps-runtime-uniform", MOCK_UNIFORM_ITEMS);

export async function getUniformItemsByClass(
  schoolId: string,
  classLevelId: string,
): Promise<UniformItem[]> {
  return withDelay(
    store.all().filter((item) => item.schoolId === schoolId && item.classLevelId === classLevelId),
  );
}

export async function getUniformItemById(id: string): Promise<UniformItem | null> {
  return withDelay(store.find(id) ?? null);
}

export interface UniformItemInput {
  schoolId: string;
  classLevelId: string;
  name: string;
  category: "uniform" | "kit";
  description?: string;
  /** Price for the smallest size — the console only collects a single base price; per-size pricing stays generated the same way the seed data is. */
  basePrice: number;
}

/** Console — Catalogue Manager. In Phase 9 this becomes a write to the Payload `uniform-items` collection. */
export async function createUniformItem(input: UniformItemInput): Promise<UniformItem> {
  const now = new Date().toISOString();
  const { basePrice, ...rest } = input;
  const item: UniformItem = {
    id: `uniform-${Date.now()}`,
    imageUrl: null,
    createdAt: now,
    updatedAt: now,
    sizeOptions: sizesFor(input.classLevelId, basePrice),
    ...rest,
  };
  store.add(item);
  return withDelay(item);
}

export async function updateUniformItem(
  id: string,
  patch: Partial<Omit<UniformItemInput, "schoolId" | "classLevelId">>,
): Promise<UniformItem | null> {
  const { basePrice, ...rest } = patch;
  const existing = store.find(id);
  const sizeOptions = basePrice !== undefined && existing ? sizesFor(existing.classLevelId, basePrice) : undefined;
  return withDelay(
    store.update(id, {
      ...rest,
      ...(sizeOptions ? { sizeOptions } : {}),
      updatedAt: new Date().toISOString(),
    }),
  );
}

export async function deleteUniformItem(id: string): Promise<void> {
  store.remove(id);
  return withDelay(undefined);
}
