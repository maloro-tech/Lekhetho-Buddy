export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function formatMaloti(amount: number): string {
  const sign = amount < 0 ? "−" : "";
  const formatted = Math.abs(amount).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}M ${formatted}`;
}

export function parseAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, "").replace(/,/g, "").replace(/^lsl/i, "").replace(/^m/i, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000_000) return null;
  return roundMoney(value);
}

export function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\n]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}
