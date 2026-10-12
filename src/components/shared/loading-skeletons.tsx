import { Skeleton } from "@/components/ui/skeleton";

/** Matches ItemCard's layout while a data-source call is resolving. */
export function ItemCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line/60 bg-card p-4">
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
    <div className="rounded-xl border border-line/60 bg-card p-5">
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

/** A generic list row (receipt / request / payment) while its list is loading. */
export function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line/60 bg-card p-4">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <div className="space-y-2">
        <Skeleton className="ml-auto h-4 w-16" />
        <Skeleton className="ml-auto h-4 w-20 rounded-full" />
      </div>
    </div>
  );
}

/** `count` list rows, with a screen-reader "Loading" announcement. */
export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * A whole-page placeholder: a header bar + cards. Used by the route-level loading screen so that
 * moving between tabs never shows a blank page while the next screen's code is still arriving.
 */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <div className="flex items-center gap-3 border-b border-line bg-card/90 px-4 py-3">
        <Skeleton className="h-6 w-40" />
        <div className="flex-1" />
        <Skeleton className="size-9 rounded-full" />
      </div>
      <div className="w-full space-y-3 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-4 w-2/3 max-w-md" />
        <ListSkeleton count={4} />
      </div>
    </div>
  );
}
