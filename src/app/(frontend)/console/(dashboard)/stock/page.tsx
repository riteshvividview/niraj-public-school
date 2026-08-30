"use client";

import { AlertTriangle, PackageSearch } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getBooksBySchool,
  getOrdersBySchool,
  getUniformItemsBySchool,
  upsertEssentialsStock,
} from "@/lib/data-source";
import { formatCurrencyINR } from "@/lib/format";
import { useClassLevels, useConsoleSchoolId, useEssentialsStock } from "@/lib/hooks/console-data";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { Book, EssentialsStockRow, Order, UniformItem } from "@/types";

const ALL_VALUE = "__all__";

/** One row per stock-trackable product/variant — a Book (variantKey "") or a UniformItem size (variantKey = size). */
interface StockLine {
  kind: "book" | "uniform";
  refId: string;
  variantKey: string;
  label: string;
  sizeLabel: string | null;
  classLevelId: string;
  price: number;
  stockRow: EssentialsStockRow | null;
  pendingCollection: number;
}

function stockKey(kind: string, refId: string, variantKey: string): string {
  return `${kind}:${refId}:${variantKey}`;
}

/** Sum of not-yet-collected quantity per (kind, refId, variantKey) across every paid order — see plan's "Pending collection" section. */
function buildPendingMap(orders: Order[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const order of orders) {
    if (order.status !== "paid") continue;
    for (const item of order.items) {
      if (item.kind !== "book" && item.kind !== "uniform") continue;
      if (item.collectedAt) continue;
      const variantKey = item.kind === "uniform" ? (item.meta ?? "") : "";
      const key = stockKey(item.kind, item.refId, variantKey);
      map.set(key, (map.get(key) ?? 0) + item.quantity);
    }
  }
  return map;
}

function buildStockLines(
  books: Book[],
  uniformItems: UniformItem[],
  stockRows: EssentialsStockRow[],
  pendingMap: Map<string, number>,
): StockLine[] {
  const stockByKey = new Map(stockRows.map((row) => [stockKey(row.kind, row.refId, row.variantKey), row]));

  const bookLines: StockLine[] = books.map((book) => {
    const key = stockKey("book", book.id, "");
    return {
      kind: "book",
      refId: book.id,
      variantKey: "",
      label: book.title,
      sizeLabel: null,
      classLevelId: book.classLevelId,
      price: book.price,
      stockRow: stockByKey.get(key) ?? null,
      pendingCollection: pendingMap.get(key) ?? 0,
    };
  });

  const uniformLines: StockLine[] = uniformItems.flatMap((item) =>
    item.sizeOptions.map((option) => {
      const key = stockKey("uniform", item.id, option.size);
      return {
        kind: "uniform" as const,
        refId: item.id,
        variantKey: option.size,
        label: item.name,
        sizeLabel: option.size,
        classLevelId: item.classLevelId,
        price: option.price,
        stockRow: stockByKey.get(key) ?? null,
        pendingCollection: pendingMap.get(key) ?? 0,
      };
    }),
  );

  return [...bookLines, ...uniformLines];
}

function StockCell({ schoolId, line, onSaved }: { schoolId: string; line: StockLine; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(line.stockRow?.quantityOnHand ?? 0));
  const [saving, setSaving] = useState(false);

  async function save() {
    const quantity = Number(value);
    if (!Number.isFinite(quantity)) {
      toast.error("Enter a valid number.");
      return;
    }
    setSaving(true);
    try {
      await upsertEssentialsStock(
        { schoolId, kind: line.kind, refId: line.refId, variantKey: line.variantKey },
        { quantityOnHand: quantity, lowStockThreshold: line.stockRow?.lowStockThreshold },
      );
      toast.success("Stock updated");
      setEditing(false);
      onSaved();
    } catch {
      toast.error("Couldn't update stock.");
    } finally {
      setSaving(false);
    }
  }

  if (!line.stockRow && !editing) {
    return (
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        Start tracking
      </Button>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 w-20"
          autoFocus
        />
        <Button size="sm" className="h-8" onClick={save} disabled={saving}>
          Save
        </Button>
        <Button variant="ghost" size="sm" className="h-8" onClick={() => setEditing(false)} disabled={saving}>
          Cancel
        </Button>
      </div>
    );
  }

  if (!line.stockRow) return null;
  const qty = line.stockRow.quantityOnHand;
  const isLow = qty <= line.stockRow.lowStockThreshold;
  return (
    <button
      type="button"
      onClick={() => {
        setValue(String(qty));
        setEditing(true);
      }}
      className={`rounded-md px-2 py-1 text-left font-medium hover:bg-muted ${isLow ? "text-destructive" : "text-ink"}`}
    >
      {qty}
    </button>
  );
}

function ThresholdCell({ schoolId, line, onSaved }: { schoolId: string; line: StockLine; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(line.stockRow?.lowStockThreshold ?? 5));

  if (!line.stockRow) return <span className="text-sub">—</span>;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(String(line.stockRow!.lowStockThreshold));
          setEditing(true);
        }}
        className="rounded-md px-2 py-1 text-sub hover:bg-muted hover:text-ink"
      >
        {line.stockRow.lowStockThreshold}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 w-16"
        autoFocus
      />
      <Button
        size="sm"
        className="h-8"
        onClick={async () => {
          const threshold = Number(value);
          if (!Number.isFinite(threshold)) {
            toast.error("Enter a valid number.");
            return;
          }
          await upsertEssentialsStock(
            { schoolId, kind: line.kind, refId: line.refId, variantKey: line.variantKey },
            { lowStockThreshold: threshold },
          );
          setEditing(false);
          onSaved();
        }}
      >
        Save
      </Button>
    </div>
  );
}

export default function StockPage() {
  const schoolId = useConsoleSchoolId();
  const { classLevels } = useClassLevels(schoolId);
  const [kindFilter, setKindFilter] = useState(ALL_VALUE);
  const [classFilter, setClassFilter] = useState(ALL_VALUE);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 250);

  const { data: books } = useSWR(schoolId ? ["console:stock:books", schoolId] : null, () => getBooksBySchool(schoolId));
  const { data: uniformItems } = useSWR(
    schoolId ? ["console:stock:uniform", schoolId] : null,
    () => getUniformItemsBySchool(schoolId),
  );
  const { stockRows, mutateStockRows: refreshStock } = useEssentialsStock(schoolId);
  const { data: orders } = useSWR(schoolId ? ["console:stock:orders", schoolId] : null, () => getOrdersBySchool(schoolId));

  const classLevelById = useMemo(() => new Map(classLevels.map((c) => [c.id, c.label])), [classLevels]);

  const allLines = useMemo(() => {
    if (!books || !uniformItems || !stockRows || !orders) return [];
    return buildStockLines(books, uniformItems, stockRows, buildPendingMap(orders));
  }, [books, uniformItems, stockRows, orders]);

  const lowStockCount = useMemo(
    () => allLines.filter((l) => l.stockRow && l.stockRow.quantityOnHand <= l.stockRow.lowStockThreshold).length,
    [allLines],
  );

  const totalValue = useMemo(
    () => allLines.reduce((sum, l) => sum + (l.stockRow ? l.stockRow.quantityOnHand * l.price : 0), 0),
    [allLines],
  );

  const trackedCount = allLines.filter((l) => l.stockRow).length;

  const filteredLines = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return allLines.filter((line) => {
      if (kindFilter !== ALL_VALUE && line.kind !== kindFilter) return false;
      if (classFilter !== ALL_VALUE && line.classLevelId !== classFilter) return false;
      if (q && !line.label.toLowerCase().includes(q)) return false;
      if (lowStockOnly && !(line.stockRow && line.stockRow.quantityOnHand <= line.stockRow.lowStockThreshold)) {
        return false;
      }
      return true;
    });
  }, [allLines, kindFilter, classFilter, debouncedSearch, lowStockOnly]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-ink">
          <PackageSearch className="size-6" />
          Essentials Stock
        </h1>
        <p className="text-sm text-sub">
          Track physical inventory for Books and Uniform &amp; Kit. Stock auto-reduces the moment a receipt is
          issued (payment), not when the item is later collected — staff only, never shown to students.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-sub">Total stock value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-bold text-ink">{formatCurrencyINR(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-sub">Products tracked</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-bold text-ink">
              {trackedCount} <span className="text-sm font-normal text-sub">/ {allLines.length}</span>
            </p>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? "border-destructive/40" : undefined}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-sub">
              {lowStockCount > 0 ? <AlertTriangle className="size-4 text-destructive" /> : null}
              Low on stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`font-heading text-2xl font-bold ${lowStockCount > 0 ? "text-destructive" : "text-ink"}`}>
              {lowStockCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3 sm:gap-4">
          <div className="w-full min-w-0 space-y-2 sm:w-auto">
            <Label>Kind</Label>
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All</SelectItem>
                <SelectItem value="book">Books</SelectItem>
                <SelectItem value="uniform">Uniform &amp; Kit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full min-w-0 space-y-2 sm:w-auto">
            <Label>Class</Label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All classes</SelectItem>
                {classLevels.map((level) => (
                  <SelectItem key={level.id} value={level.id}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full min-w-0 flex-1 space-y-2 sm:w-auto">
            <Label>Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Product name…"
              className="w-full sm:w-48"
            />
          </div>
          <Button
            variant={lowStockOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setLowStockOnly((v) => !v)}
            className="w-full sm:w-auto"
          >
            <AlertTriangle className="size-4" />
            Low stock only
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock on hand</TableHead>
                <TableHead>Low-stock at</TableHead>
                <TableHead>Pending collection</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLines.map((line) => {
                const isLow = line.stockRow ? line.stockRow.quantityOnHand <= line.stockRow.lowStockThreshold : false;
                return (
                  <TableRow key={stockKey(line.kind, line.refId, line.variantKey)}>
                    <TableCell>
                      <p className="font-medium text-ink">{line.label}</p>
                      <p className="text-xs text-sub capitalize">{line.kind}</p>
                    </TableCell>
                    <TableCell>{classLevelById.get(line.classLevelId) ?? "—"}</TableCell>
                    <TableCell>{line.sizeLabel ?? "—"}</TableCell>
                    <TableCell>{formatCurrencyINR(line.price)}</TableCell>
                    <TableCell>
                      <StockCell schoolId={schoolId} line={line} onSaved={() => refreshStock()} />
                    </TableCell>
                    <TableCell>
                      <ThresholdCell schoolId={schoolId} line={line} onSaved={() => refreshStock()} />
                    </TableCell>
                    <TableCell>{line.pendingCollection > 0 ? line.pendingCollection : "—"}</TableCell>
                    <TableCell>
                      {line.stockRow ? formatCurrencyINR(line.stockRow.quantityOnHand * line.price) : "—"}
                    </TableCell>
                    <TableCell>
                      {!line.stockRow ? (
                        <Badge variant="outline">Not tracked</Badge>
                      ) : isLow ? (
                        <Badge variant="destructive">Low stock</Badge>
                      ) : (
                        <Badge variant="secondary">In stock</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {books && uniformItems && stockRows && orders && filteredLines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sub">
                    No products match these filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
