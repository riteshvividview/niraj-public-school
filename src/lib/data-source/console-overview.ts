import type { ConsoleOverview } from "@/types";

/** Console — one call for everything the dashboards and nav need to cross-link the features. */
export async function getConsoleOverview(schoolId: string): Promise<ConsoleOverview> {
  const res = await fetch(`/api/console/overview?schoolId=${encodeURIComponent(schoolId)}`, { cache: "no-store", credentials: "same-origin" });
  if (!res.ok) throw new Error("Could not load the overview.");
  return (await res.json()) as ConsoleOverview;
}
