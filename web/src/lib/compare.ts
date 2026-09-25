import type { IndicatorPoint } from "@/lib/labrechaApi";

export const COMPARE_BASE = 100;

export interface IndexedSeries {
  labels: string[];
  values: (number | null)[];
  baseDate: string;
  firstValue: number;
  lastValue: number;
  changePct: number;
}

const MONTH_KEY_LENGTH = "YYYY-MM".length;

function monthKey(isoDate: string): string {
  return isoDate.slice(0, MONTH_KEY_LENGTH);
}

function lastValueByMonth(points: IndicatorPoint[]): Map<string, number> {
  const byMonth = new Map<string, number>();
  for (const point of points) {
    const value = Number.parseFloat(point.value);
    if (Number.isFinite(value)) {
      byMonth.set(monthKey(point.date), value);
    }
  }
  return byMonth;
}

export function commonMonths(first: IndicatorPoint[], second: IndicatorPoint[]): string[] {
  const left = lastValueByMonth(first);
  const right = lastValueByMonth(second);
  return [...left.keys()]
    .filter((month) => right.has(month))
    .sort((earlier, later) => earlier.localeCompare(later));
}

export function indexToBase(points: IndicatorPoint[], months: string[]): IndexedSeries | null {
  if (months.length === 0) {
    return null;
  }
  const byMonth = lastValueByMonth(points);
  const baseMonth = months[0] ?? "";
  const base = byMonth.get(baseMonth);
  if (base === undefined || base === 0) {
    return null;
  }

  const values = months.map((month) => {
    const value = byMonth.get(month);
    return value === undefined ? null : (value / base) * COMPARE_BASE;
  });

  const lastMonth = months[months.length - 1] ?? baseMonth;
  const lastValue = byMonth.get(lastMonth) ?? base;

  return {
    labels: months,
    values,
    baseDate: baseMonth,
    firstValue: base,
    lastValue,
    changePct: ((lastValue - base) / Math.abs(base)) * COMPARE_BASE,
  };
}
