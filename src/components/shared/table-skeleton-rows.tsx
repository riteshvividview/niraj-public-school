import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

/** Placeholder rows for a console table while its data is loading — so a table never just sits empty. */
export function TableSkeletonRows({ columns, rows = 4 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <TableRow key={row} aria-hidden>
          {Array.from({ length: columns }).map((__, col) => (
            <TableCell key={col}>
              <Skeleton className={col === 0 ? "h-4 w-40" : "h-4 w-16"} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
