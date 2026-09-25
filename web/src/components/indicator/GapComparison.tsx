"use client";

import { AnnotatedSeriesChart, type ChartSeries } from "@/components/core";
import { GapHeader } from "@/components/indicator/gapComparison/GapHeader";
import { GapLatestSummary, type LegReading } from "@/components/indicator/gapComparison/GapLatestSummary";
import { GapSourceNotes } from "@/components/indicator/gapComparison/GapSourceNotes";
import { useLegPoints } from "@/components/indicator/gapComparison/useLegPoints";
import { Skeleton } from "@/components/ui/skeleton";
import { usePoliticalEvents } from "@/hooks/useLabrecha";
import { GAP_BY_ID, type GapDef, type GapLeg, computeGap } from "@/lib/gaps";
import { DEFAULT_RANGE, RANGE_MONTHS, formatDateAR } from "@/lib/indicators";
import type { PoliticalEvent } from "@/lib/labrechaApi";
import {
  type AlignedSeries,
  type ParsedPoint,
  alignSources,
  eventsToChartEvents,
  rangeDateFrom,
  todayISO,
  yearLabels,
} from "@/lib/series";
import { useState, type ReactElement } from "react";

const SERIES_COLORS = ["var(--chart)", "var(--gap)"];
const FALLBACK_RANGE_MONTHS = 12;
const CHART_HEIGHT = 320;
const MIN_CHART_POINTS = 2;
const EMPTY_LEG: GapLeg = { code: "", source: "", label: "" };

function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length] ?? "var(--chart)";
}

function buildChartSeries(aligned: AlignedSeries): ChartSeries[] {
  return aligned.lines.map((line, index) => ({
    name: line.source,
    color: seriesColor(index),
    data: line.data.map((value, position) => ({
      t: formatDateAR(aligned.axis[position] ?? ""),
      v: value,
    })),
  }));
}

function GapChart({
  def,
  aligned,
  events,
}: Readonly<{ def: GapDef; aligned: AlignedSeries; events: PoliticalEvent[] }>): ReactElement {
  if (aligned.axis.length < MIN_CHART_POINTS) {
    return (
      <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink2)", margin: 0 }}>
        No hay suficiente serie en el rango seleccionado para graficar esta brecha.
      </p>
    );
  }
  return (
    <AnnotatedSeriesChart
      series={buildChartSeries(aligned)}
      events={eventsToChartEvents(aligned.axis, events)}
      gapFill
      yFormat={(value) => def.format(value)}
      xLabels={yearLabels(aligned.axis)}
      height={CHART_HEIGHT}
    />
  );
}

function CurrentGap({
  def,
  legA,
  legB,
  pointsA,
  pointsB,
}: Readonly<{
  def: GapDef;
  legA: GapLeg;
  legB: GapLeg;
  pointsA: ParsedPoint[];
  pointsB: ParsedPoint[];
}>): ReactElement | null {
  const latestA = pointsA[pointsA.length - 1];
  const latestB = pointsB[pointsB.length - 1];
  if (!latestA || !latestB) {
    return null;
  }
  const readings: LegReading[] = [
    { leg: legA, latest: latestA, color: seriesColor(0) },
    { leg: legB, latest: latestB, color: seriesColor(1) },
  ];
  return (
    <GapLatestSummary def={def} gap={computeGap(def, latestA.value, latestB.value)} readings={readings} />
  );
}

export function GapComparison({ id }: Readonly<{ id: string }>): ReactElement | null {
  const [range, setRange] = useState(DEFAULT_RANGE);
  const def = GAP_BY_ID[id];
  const dateFrom = rangeDateFrom(todayISO(), RANGE_MONTHS[range] ?? FALLBACK_RANGE_MONTHS);

  const legA = def?.legs[0] ?? EMPTY_LEG;
  const legB = def?.legs[1] ?? EMPTY_LEG;
  const legPointsA = useLegPoints(legA, dateFrom);
  const legPointsB = useLegPoints(legB, dateFrom);
  const { data: eventsData } = usePoliticalEvents({ date_from: dateFrom, date_to: todayISO() });

  if (!def) {
    return null;
  }

  if (legPointsA.isLoading || legPointsB.isLoading) {
    return <Skeleton className="h-[360px] rounded-[10px]" />;
  }

  const pointsA = legPointsA.points;
  const pointsB = legPointsB.points;
  const aligned = alignSources([
    { source: legA.label, points: pointsA },
    { source: legB.label, points: pointsB },
  ]);

  return (
    <div
      style={{
        background: "var(--raise)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "26px 28px 22px",
      }}
    >
      <GapHeader def={def} range={range} onRangeChange={setRange} />

      <CurrentGap def={def} legA={legA} legB={legB} pointsA={pointsA} pointsB={pointsB} />

      <GapChart def={def} aligned={aligned} events={eventsData ?? []} />

      <GapSourceNotes legs={[legA, legB]} />
    </div>
  );
}
