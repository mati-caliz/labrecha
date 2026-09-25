import type { ChartEvent, ChartSeries } from "@/components/core";
import { sourceColor } from "@/components/indicator/detail/styles";
import { type TableRow, buildTableRows } from "@/components/indicator/detail/SeriesTable";
import {
  type VariationDisplay,
  gapPercent,
  variationVsMonthsAgo,
  variationVsPreviousPoint,
} from "@/components/indicator/detail/variation";
import { freshnessForCode } from "@/lib/freshness";
import { type IndicatorDisplay, formatDateAR, sourceLabel } from "@/lib/indicators";
import type {
  IndicatorPoint,
  IndicatorSeries,
  IndicatorSourceSummary,
  PoliticalEvent,
} from "@/lib/labrechaApi";
import {
  type AlignedSeries,
  type ParsedPoint,
  alignSources,
  eventsToChartEvents,
  parsePoints,
  yearLabels,
} from "@/lib/series";
import type { UseQueryResult } from "@tanstack/react-query";

const MONTHS_PER_YEAR = 12;
const MIN_COMPARABLE_COUNT = 2;

export interface ParsedSource {
  source: string;
  points: ParsedPoint[];
}

export interface LatestExport {
  source: string;
  value: number;
  date: string;
}

export interface DetailVariations {
  step: VariationDisplay | undefined;
  month: VariationDisplay | undefined;
  year: VariationDisplay | undefined;
}

export interface IndicatorDetailModel {
  parsedSources: ParsedSource[];
  aligned: AlignedSeries;
  chartSeries: ChartSeries[];
  chartEvents: ChartEvent[];
  xLabels: string[];
  hasSeries: boolean;
  isComparator: boolean;
  primary: IndicatorSourceSummary | undefined;
  primaryValue: number | undefined;
  variations: DetailVariations;
  gapPct: number | undefined;
  tableRows: TableRow[];
  stale: boolean;
  baseMonth: string | undefined;
  latestExport: LatestExport | undefined;
}

interface DetailModelInput {
  code: string;
  indicator: IndicatorDisplay;
  ordered: IndicatorSourceSummary[];
  seriesQueries: UseQueryResult<IndicatorSeries>[];
  events: PoliticalEvent[];
}

function baseMonthOf(points: IndicatorPoint[]): string | undefined {
  for (const point of points) {
    const baseMonth = point.meta["base_month"];
    if (typeof baseMonth === "string") {
      return baseMonth;
    }
  }
  return undefined;
}

function parseSources(
  ordered: IndicatorSourceSummary[],
  seriesQueries: UseQueryResult<IndicatorSeries>[],
): ParsedSource[] {
  return ordered
    .map((source, index) => ({
      source: source.source,
      points: parsePoints(seriesQueries[index]?.data?.points ?? []),
    }))
    .filter((source) => source.points.length > 0);
}

function buildChartSeries(aligned: AlignedSeries): ChartSeries[] {
  return aligned.lines.map((line, index) => ({
    name: sourceLabel(line.source),
    color: sourceColor(index),
    data: line.data.map((value, position) => ({
      t: formatDateAR(aligned.axis[position] ?? ""),
      v: value,
    })),
  }));
}

function buildVariations(indicator: IndicatorDisplay, primaryPoints: ParsedPoint[]): DetailVariations {
  return {
    step: variationVsPreviousPoint(indicator, primaryPoints),
    month: variationVsMonthsAgo(indicator, primaryPoints, 1),
    year: variationVsMonthsAgo(indicator, primaryPoints, MONTHS_PER_YEAR),
  };
}

function latestValueOf(source: IndicatorSourceSummary | undefined): number | undefined {
  return source ? Number.parseFloat(source.latest_value) : undefined;
}

function latestExportOf(
  primary: IndicatorSourceSummary | undefined,
  primaryValue: number | undefined,
): LatestExport | undefined {
  if (!primary || primaryValue === undefined) {
    return undefined;
  }
  return { source: primary.source, value: primaryValue, date: primary.last_date };
}

export function buildIndicatorDetailModel({
  code,
  indicator,
  ordered,
  seriesQueries,
  events,
}: DetailModelInput): IndicatorDetailModel {
  const parsedSources = parseSources(ordered, seriesQueries);
  const aligned = alignSources(parsedSources);
  const isComparator = ordered.length >= MIN_COMPARABLE_COUNT;
  const primary = ordered[0];
  const primaryPoints = parsedSources.find((source) => source.source === primary?.source)?.points ?? [];
  const primaryValue = latestValueOf(primary);
  const secondValue = isComparator ? latestValueOf(ordered[1]) : undefined;

  return {
    parsedSources,
    aligned,
    chartSeries: buildChartSeries(aligned),
    chartEvents: eventsToChartEvents(aligned.axis, events),
    xLabels: yearLabels(aligned.axis),
    hasSeries: aligned.axis.length >= MIN_COMPARABLE_COUNT,
    isComparator,
    primary,
    primaryValue,
    variations: buildVariations(indicator, primaryPoints),
    gapPct: gapPercent(primaryValue, secondValue),
    tableRows: buildTableRows(aligned),
    stale: primary ? freshnessForCode(code, primary.last_date).stale : false,
    baseMonth: baseMonthOf(seriesQueries.flatMap((query) => query.data?.points ?? [])),
    latestExport: latestExportOf(primary, primaryValue),
  };
}
