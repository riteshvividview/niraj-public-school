import { Skeleton } from "@/components/ui/skeleton";

/** Matches ItemCard's layout while a data-source call is resolving. */
export function ItemCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4">
      <Skeleton className="size-14 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3.5 w-1/4" />
      </div>
      <Skeleton className="size-5 shrink-0 rounded-sm" />
    </div>
  );
}

/** Matches ProgramCard's layout. */
export function ProgramCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

/** Matches ReceiptCard's layout. */
export function ReceiptCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="flex items-center justify-between gap-3 bg-muted p-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex flex-col items-center gap-4 border-b border-dashed border-line p-6">
        <Skeleton className="size-36 rounded-xl" />
      </div>
      <div className="space-y-2 p-5">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3.5 w-1/2" />
        <div className="flex items-center justify-between border-t border-line pt-3">
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </div>
  );
}
