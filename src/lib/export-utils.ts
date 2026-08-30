import * as XLSX from "xlsx";

/**
 * Shared CSV/Excel export helpers — factored out of the Payments page's
 * original inline `toCsv`/`handleExport` so the Reports Dashboard (and any
 * future console export) doesn't duplicate blob-download boilerplate.
 */

const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

/**
 * Only quote a cell when it actually needs it (contains a comma, quote, or
 * newline). A number — or a numeric-looking string, e.g. a pre-stringified
 * amount — is emitted bare, so spreadsheet apps import it as a real number
 * (summable, sortable, right-aligned) instead of text.
 */
function csvCell(cell: string | number): string {
  if (typeof cell === "number") return String(cell);
  if (PLAIN_NUMBER.test(cell)) return cell;
  return `"${cell.replace(/"/g, '""')}"`;
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  downloadBlob(filename, new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" }));
}

export interface WorkbookSheet {
  /** Truncated to 31 chars — Excel's own sheet-name limit. */
  name: string;
  rows: (string | number)[][];
}

/** One .xlsx file, one sheet per entry — e.g. Reports' "Export full report." */
export function downloadWorkbook(filename: string, sheets: WorkbookSheet[]) {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }
  XLSX.writeFile(workbook, filename);
}
