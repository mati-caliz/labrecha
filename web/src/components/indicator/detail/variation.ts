import type { IndicatorDisplay } from "@/lib/indicators";
import { formatNumberAR } from "@/lib/indicators";
import { ISO_DATE_LENGTH } from "@/lib/isoDates";
import type { ParsedPoint } from "@/lib/series";

export interface VariationDisplay {
  text: string;
  color: string;
  background: string;
}

const PERCENT_SCALE = 100;
const NEUTRAL_VARIATION: Omit<VariationDisplay, "text"> = { color: "var(--ink2)", background: "transparent" };
const GOOD_VARIATION: Omit<VariationDisplay, "text"> = { color: "var(--pos)", background: "var(--pos-bg)" };
const BAD_VARIATION: Omit<VariationDisplay, "text"> = { color: "var(--neg)", background: "var(--neg-bg)" };

interface VariationDelta {
  delta: number;
  label: string;
}

function computeDelta(latest: number, base: number, indicator: IndicatorDisplay): VariationDelta | undefined {
  if (indicator.variation === "pct") {
    if (base === 0) {
      return undefined;
    }
    const delta = ((latest - base) / base) * PERCENT_SCALE;
    return { delta, label: `${formatNumberAR(Math.abs(delta), 1)}%` };
  }
  const delta = latest - base;
  return { delta, label: `${formatNumberAR(Math.abs(delta), 1)}${indicator.variationSuffix ?? " pp"}` };
}

function isGoodChange(rising: boolean, goodWhen: IndicatorDisplay["goodWhen"]): boolean {
  if (goodWhen === "neutral") {
    return true;
  }
  return goodWhen === "up" ? rising : !rising;
}

function computeVariation(
  latest: number,
  base: number | undefined,
  indicator: IndicatorDisplay,
): VariationDisplay | undefined {
  if (base === undefined || indicator.variation === "none") {
    return undefined;
  }
  const variation = computeDelta(latest, base, indicator);
  if (variation === undefined) {
    return undefined;
  }
  const { delta, label } = variation;
  if (delta === 0) {
    return { text: `= ${label}`, ...NEUTRAL_VARIATION };
  }
  const rising = delta > 0;
  const tone = isGoodChange(rising, indicator.goodWhen) ? GOOD_VARIATION : BAD_VARIATION;
  return { text: `${rising ? "▲" : "▼"} ${label}`, ...tone };
}

function valueBefore(points: ParsedPoint[], targetDate: string): number | undefined {
  let result: number | undefined;
  for (const point of points) {
    if (point.date <= targetDate) {
      result = point.value;
    } else {
      break;
    }
  }
  return result;
}

function shiftDate(isoDate: string, months: number): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setMonth(date.getMonth() - months);
  return date.toISOString().slice(0, ISO_DATE_LENGTH);
}

export function variationVsPreviousPoint(
  indicator: IndicatorDisplay,
  points: ParsedPoint[],
): VariationDisplay | undefined {
  const lastPoint = points[points.length - 1];
  const previousPoint = points[points.length - 2];
  if (!lastPoint || !previousPoint) {
    return undefined;
  }
  return computeVariation(lastPoint.value, previousPoint.value, indicator);
}

export function variationVsMonthsAgo(
  indicator: IndicatorDisplay,
  points: ParsedPoint[],
  monthsAgo: number,
): VariationDisplay | undefined {
  const lastPoint = points[points.length - 1];
  if (!lastPoint) {
    return undefined;
  }
  return computeVariation(
    lastPoint.value,
    valueBefore(points, shiftDate(lastPoint.date, monthsAgo)),
    indicator,
  );
}

export function gapPercent(
  first: number | null | undefined,
  second: number | null | undefined,
): number | undefined {
  if (first === undefined || second === undefined || first === null || second === null) {
    return undefined;
  }
  const largest = Math.max(Math.abs(first), Math.abs(second));
  const base = largest === 0 || Number.isNaN(largest) ? 1 : largest;
  return (Math.abs(first - second) / base) * PERCENT_SCALE;
}
