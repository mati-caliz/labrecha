import type { ChartEvent } from "@/components/core";
import type { IndicatorPoint, PoliticalEvent } from "@/lib/labrechaApi";

export interface ParsedPoint {
  date: string;
  value: number;
}

export interface SourceLine {
  source: string;
  data: (number | null)[];
}

export interface AlignedSeries {
  axis: string[];
  lines: SourceLine[];
}

export function parsePoints(points: IndicatorPoint[]): ParsedPoint[] {
  return points
    .map((point) => ({ date: point.date, value: Number.parseFloat(point.value) }))
    .filter((point) => Number.isFinite(point.value))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function mergePoints(history: ParsedPoint[], live: ParsedPoint[]): ParsedPoint[] {
  const byDate = new Map<string, ParsedPoint>();
  for (const point of history) {
    byDate.set(point.date, point);
  }
  for (const point of live) {
    byDate.set(point.date, point);
  }
  return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function downsample(dates: string[], maxPoints: number): string[] {
  if (dates.length <= maxPoints) {
    return dates;
  }
  const step = (dates.length - 1) / (maxPoints - 1);
  const sampled: string[] = [];
  const lastDate = dates[dates.length - 1] ?? "";
  for (let i = 0; i < maxPoints; i += 1) {
    sampled.push(dates[Math.round(i * step)] ?? lastDate);
  }
  sampled[sampled.length - 1] = lastDate;
  return sampled;
}

function resample(points: ParsedPoint[], axis: string[]): (number | null)[] {
  const out: (number | null)[] = [];
  let index = 0;
  let last: number | null = null;
  for (const date of axis) {
    let current = points[index];
    while (current && current.date <= date) {
      last = current.value;
      index += 1;
      current = points[index];
    }
    out.push(last);
  }
  return out;
}

export function alignSources(
  sources: { source: string; points: ParsedPoint[] }[],
  maxPoints = 400,
): AlignedSeries {
  const dateSet = new Set<string>();
  for (const source of sources) {
    for (const point of source.points) {
      dateSet.add(point.date);
    }
  }
  const union = Array.from(dateSet).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const axis = downsample(union, maxPoints);
  const lines = sources.map((source) => ({
    source: source.source,
    data: resample(source.points, axis),
  }));
  return { axis, lines };
}

function nearestIndex(axis: string[], date: string): number {
  let lo = 0;
  let hi = axis.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((axis[mid] ?? "") < date) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  if (lo > 0 && Math.abs(dateDiff(axis[lo - 1] ?? "", date)) < Math.abs(dateDiff(axis[lo] ?? "", date))) {
    return lo - 1;
  }
  return lo;
}

function dateDiff(a: string, b: string): number {
  return new Date(a).getTime() - new Date(b).getTime();
}

export function eventsToChartEvents(axis: string[], events: PoliticalEvent[]): ChartEvent[] {
  if (axis.length === 0) {
    return [];
  }
  const first = axis[0] ?? "";
  const last = axis[axis.length - 1] ?? "";
  return events
    .filter((event) => event.date >= first && event.date <= last)
    .map((event) => ({ index: nearestIndex(axis, event.date), label: event.title }));
}

export function yearLabels(axis: string[], count = 5): string[] {
  const labels = axis.map(() => "");
  if (axis.length === 0) {
    return labels;
  }
  const step = (axis.length - 1) / Math.max(1, count - 1);
  let lastYear = "";
  for (let i = 0; i < count; i += 1) {
    const position = Math.round(i * step);
    const year = axis[position]?.slice(0, 4) ?? "";
    if (year && year !== lastYear) {
      labels[position] = year;
      lastYear = year;
    }
  }
  return labels;
}

export function rangeDateFrom(latestDate: string | undefined, months: number): string | undefined {
  if (!latestDate || !Number.isFinite(months)) {
    return undefined;
  }
  const date = new Date(latestDate);
  date.setMonth(date.getMonth() - months);
  return date.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function orderIndicatorSources<T extends { source: string; count: number }>(
  sources: T[],
  preferredSource: string | undefined,
): T[] {
  return [...sources].sort((first, second) => {
    if (first.source === preferredSource) {
      return -1;
    }
    if (second.source === preferredSource) {
      return 1;
    }
    return second.count - first.count;
  });
}

export function latestSourceDate(sources: { last_date: string }[]): string {
  return sources.reduce((max, source) => (source.last_date > max ? source.last_date : max), "");
}
