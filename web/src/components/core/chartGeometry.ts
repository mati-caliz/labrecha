import { hasText } from "@/lib/utils";
import type { ChartSeries, SeriesPoint } from "./chartTypes";

export const CHART_WIDTH = 800;
export const CHART_PADDING = { left: 56, right: 16, top: 26, bottom: 26 } as const;

const Y_RANGE_BOTTOM_MARGIN = 0.08;
const Y_RANGE_TOP_MARGIN = 0.1;
const Y_TICK_FRACTIONS = [0, 0.25, 0.5, 0.75, 1];
const DEFAULT_MAX_FRACTION_DIGITS = 1;

type Interval = readonly [number, number];

export type Projection = (index: number, value: number) => string;

export interface ChartFrame {
  height: number;
  pointCount: number;
  ticks: number[];
  xOf: (index: number) => number;
  yOf: (value: number) => number;
  project: Projection;
  indexAt: (chartX: number) => number;
}

export function seriesColor(color: string | undefined, index: number): string {
  return hasText(color) ? color : `var(--serie-${index + 1})`;
}

function nonZeroOrOne(value: number): number {
  return value === 0 || Number.isNaN(value) ? 1 : value;
}

function scale(value: number, [domainStart, domainEnd]: Interval, [rangeStart, rangeEnd]: Interval): number {
  return (
    rangeStart + ((value - domainStart) / nonZeroOrOne(domainEnd - domainStart)) * (rangeEnd - rangeStart)
  );
}

export function defaultValueFormat(value: number): string {
  return value.toLocaleString("es-AR", { maximumFractionDigits: DEFAULT_MAX_FRACTION_DIGITS });
}

function valueBounds(series: ChartSeries[]): Interval {
  const values = series.flatMap((entry) =>
    entry.data.map((point) => point.v).filter((value): value is number => value !== null),
  );
  if (values.length === 0) {
    return [0, 1];
  }
  return [Math.min(...values), Math.max(...values)];
}

export function buildChartFrame(series: ChartSeries[], height: number): ChartFrame {
  const [min, max] = valueBounds(series);
  const span = nonZeroOrOne(max - min);
  const valueDomain: Interval = [min - span * Y_RANGE_BOTTOM_MARGIN, max + span * Y_RANGE_TOP_MARGIN];
  const pointCount = Math.max(...series.map((entry) => entry.data.length));
  const indexDomain: Interval = [0, pointCount - 1];
  const horizontalRange: Interval = [CHART_PADDING.left, CHART_WIDTH - CHART_PADDING.right];
  const verticalRange: Interval = [height - CHART_PADDING.bottom, CHART_PADDING.top];
  const xOf = (index: number): number => scale(index, indexDomain, horizontalRange);
  const yOf = (value: number): number => scale(value, valueDomain, verticalRange);
  const [domainStart, domainEnd] = valueDomain;
  return {
    height,
    pointCount,
    ticks: Y_TICK_FRACTIONS.map((fraction) => domainStart + fraction * (domainEnd - domainStart)),
    xOf,
    yOf,
    project: (index, value) => `${xOf(index).toFixed(1)},${yOf(value).toFixed(1)}`,
    indexAt: (chartX) => Math.round(scale(chartX, horizontalRange, indexDomain)),
  };
}

export function linePath(data: SeriesPoint[], project: Projection): string {
  const commands: string[] = [];
  let penDown = false;
  for (const [index, point] of data.entries()) {
    if (point.v === null) {
      penDown = false;
      continue;
    }
    commands.push(`${penDown ? "L" : "M"}${project(index, point.v)}`);
    penDown = true;
  }
  return commands.join(" ");
}

function measuredTogether(first: SeriesPoint[], second: SeriesPoint[]): number[][] {
  const segments: number[][] = [];
  let segment: number[] = [];
  const length = Math.min(first.length, second.length);
  for (let index = 0; index < length; index += 1) {
    const value = first[index]?.v;
    const other = second[index]?.v;
    if (value === null || value === undefined || other === null || other === undefined) {
      if (segment.length >= 2) {
        segments.push(segment);
      }
      segment = [];
      continue;
    }
    segment.push(index);
  }
  if (segment.length >= 2) {
    segments.push(segment);
  }
  return segments;
}

export function gapAreaPath(first: SeriesPoint[], second: SeriesPoint[], project: Projection): string | null {
  const subpaths = measuredTogether(first, second).map((segment) => {
    const forward = segment.map((index) => project(index, first[index]?.v ?? 0));
    const back = [...segment].reverse().map((index) => project(index, second[index]?.v ?? 0));
    return `M${forward.join(" L")} L${back.join(" L")} Z`;
  });
  return subpaths.length > 0 ? subpaths.join(" ") : null;
}
