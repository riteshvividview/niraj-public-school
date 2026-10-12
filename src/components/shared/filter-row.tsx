"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A row of filter controls. From tablet up it is just a wrapping row; on a phone it folds behind one
 * "Filters" button so six or seven fields don't push the actual list off the screen.
 */
export function FilterRow({ children, className }: { children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button type="button" variant="outline" size="sm" className="gap-1.5 md:hidden" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <SlidersHorizontal className="size-4" />
        Filters &amp; search
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </Button>
      <div className={cn("flex-wrap items-end gap-3 md:mt-0 md:flex", open ? "mt-3 flex" : "hidden", className)}>{children}</div>
    </div>
  );
}
