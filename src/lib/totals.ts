import { inBounds, type Period, periodBounds, todayISO } from "./dates.ts";
import { roundMoney } from "./format.ts";

export interface DatedAmount {
  amount: number;
  entry_date: string;
}

/** Totals are calculated here, never by the assistant. */
export function sumMaloti(values: number[]): number {
  const cents = values.reduce((sum, value) => sum + Math.round(value * 100), 0);
  return cents / 100;
}

export function netMaloti(sales: number, expenses: number): number {
  return roundMoney(sales - expenses);
}

export function sumInBounds(entries: DatedAmount[], bounds: { start: string; end: string }): number {
  return sumMaloti(entries.filter((entry) => inBounds(entry.entry_date, bounds)).map((entry) => entry.amount));
}

export function daysWithRecords(dates: string[], bounds: { start: string; end: string }): number {
  return new Set(dates.filter((date) => inBounds(date, bounds))).size;
}

export function snapshot(sales: DatedAmount[], expenses: DatedAmount[], today = todayISO()) {
  const month = periodBounds("month", today);
  const day = periodBounds("today", today);
  const salesMonth = sumInBounds(sales, month);
  const expensesMonth = sumInBounds(expenses, month);
  return {
    salesToday: sumInBounds(sales, day),
    expensesToday: sumInBounds(expenses, day),
    salesMonth,
    expensesMonth,
    netMonth: netMaloti(salesMonth, expensesMonth),
    daysThisMonth: daysWithRecords(
      [...sales.map((entry) => entry.entry_date), ...expenses.map((entry) => entry.entry_date)],
      month,
    ),
  };
}

export function periodNet(sales: DatedAmount[], expenses: DatedAmount[], period: Period, today = todayISO()): number {
  const bounds = periodBounds(period, today);
  return netMaloti(sumInBounds(sales, bounds), sumInBounds(expenses, bounds));
}
