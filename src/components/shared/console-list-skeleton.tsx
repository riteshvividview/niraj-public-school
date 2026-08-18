import { Skeleton } from "@/components/ui/skeleton";

/**
 * Row-shaped loading placeholder for console list pages (Students,
 * Payments, Reports) — shown while a data-source call to Supabase is in
 * flight, distinct from the real "no results" empty state. Callers must
 * initialize their list state as `null` (loading) vs. `[]` (loaded, empty)
 * for this distinction to mean anything.
 */
export function ConsoleListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-line/60 p-4">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Compact placeholder for stat tiles (Reports Dashboard). */
export function ConsoleStatSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-card p-4" aria-hidden="true">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2 h-7 w-16" />
    </div>
  );
}
