import type { UserProfile } from "@/types";
import { MOCK_USERS } from "@/lib/mock/users";
import { withDelay } from "./_internal";

export async function getUserProfileById(id: string): Promise<UserProfile | null> {
  return withDelay(MOCK_USERS.find((user) => user.id === id) ?? null);
}

export async function findUserByMobile(mobileNumber: string): Promise<UserProfile | null> {
  return withDelay(MOCK_USERS.find((user) => user.mobileNumber === mobileNumber) ?? null);
}
