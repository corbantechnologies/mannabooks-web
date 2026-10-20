const money = new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 12,345.60 (no currency sign; screens show the currency once in the header or column). */
export function fmt(value: string | number | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  return Number.isFinite(n) ? money.format(n as number) : "0.00";
}

/** Blank for zero, for debit/credit columns. */
export function fmtNonZero(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return n === 0 ? "" : fmt(n);
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

export function todayIso(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** A line's quantity, with its unit when it isn't the product's own (e.g. "2 ctn"). */
export function qtyText(line: { quantity?: string | number | null; unit?: string | null; unit_factor?: string | number | null }): string {
  const q = String(Number(line.quantity ?? 0));
  return line.unit && Number(line.unit_factor ?? 1) !== 1 ? `${q} ${line.unit}` : q;
}
