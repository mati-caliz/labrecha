"use client";

import { AnnotatedSeriesChart, type ChartSeries } from "@/components/core";
import { Skeleton } from "@/components/ui/skeleton";
import { useIndicatorSeries, usePoliticalEvents } from "@/hooks/useLabrecha";
import { GAP_BY_ID, computeGap } from "@/lib/gaps";
import { DEFAULT_RANGE, RANGE_MONTHS, SOURCE_METHODOLOGY, formatDateAR, sourceLabel } from "@/lib/indicators";
import {
  alignSources,
  eventsToChartEvents,
  mergePoints,
  parsePoints,
  rangeDateFrom,
  todayISO,
  yearLabels,
} from "@/lib/series";
import { type CSSProperties, useState } from "react";

const RANGE_OPTIONS = ["6M", "1A", "5A", "Máx"];
const SERIES_COLORS = ["var(--chart)", "var(--gap)"];

function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length] ?? "var(--chart)";
}
const MONO = "var(--font-jb-mono)";

const rangeStyle = (active: boolean): CSSProperties => ({
  fontFamily: MONO,
  fontSize: "0.7rem",
  padding: "5px 12px",
  borderRadius: "var(--radius-pill)",
  cursor: "pointer",
  border: active ? "1px solid var(--ink)" : "1px solid var(--line)",
  background: active ? "var(--ink)" : "transparent",
  color: active ? "var(--paper)" : "var(--ink2)",
});

export function GapComparison({ id }: { id: string }) {
  const [range, setRange] = useState(DEFAULT_RANGE);
  const def = GAP_BY_ID[id];
  const dateFrom = rangeDateFrom(todayISO(), RANGE_MONTHS[range] ?? 12);

  const legA = def?.legs[0] ?? { code: "", source: "", label: "" };
  const legB = def?.legs[1] ?? { code: "", source: "", label: "" };
  const queryA = useIndicatorSeries(legA.code, {
    source: legA.source,
    order: "asc",
    date_from: dateFrom,
  });
  const queryB = useIndicatorSeries(legB.code, {
    source: legB.source,
    order: "asc",
    date_from: dateFrom,
  });
  const historyQueryA = useIndicatorSeries(legA.code, {
    source: legA.historySource ?? legA.source,
    order: "asc",
    date_from: dateFrom,
  });
  const historyQueryB = useIndicatorSeries(legB.code, {
    source: legB.historySource ?? legB.source,
    order: "asc",
    date_from: dateFrom,
  });
  const { data: eventsData } = usePoliticalEvents({ date_from: dateFrom, date_to: todayISO() });

  if (!def) {
    return null;
  }

  if (queryA.isLoading || queryB.isLoading || historyQueryA.isLoading || historyQueryB.isLoading) {
    return <Skeleton className="h-[360px] rounded-[10px]" />;
  }

  const pointsA = mergePoints(
    legA.historySource ? parsePoints(historyQueryA.data?.points ?? []) : [],
    parsePoints(queryA.data?.points ?? []),
  );
  const pointsB = mergePoints(
    legB.historySource ? parsePoints(historyQueryB.data?.points ?? []) : [],
    parsePoints(queryB.data?.points ?? []),
  );

  const aligned = alignSources([
    { source: legA.label, points: pointsA },
    { source: legB.label, points: pointsB },
  ]);
  const chartSeries: ChartSeries[] = aligned.lines.map((line, index) => ({
    name: line.source,
    color: seriesColor(index),
    data: line.data.map((value, position) => ({
      t: formatDateAR(aligned.axis[position] ?? ""),
      v: value,
    })),
  }));
  const chartEvents = eventsToChartEvents(aligned.axis, eventsData ?? []);
  const xLabels = yearLabels(aligned.axis);
  const hasSeries = aligned.axis.length >= 2;

  const latestA = pointsA[pointsA.length - 1];
  const latestB = pointsB[pointsB.length - 1];
  const gap = latestA && latestB ? computeGap(def, latestA.value, latestB.value) : undefined;

  return (
    <div
      style={{
        background: "var(--raise)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "26px 28px 22px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "1.375rem",
              letterSpacing: "-0.015em",
              margin: "0 0 4px",
            }}
          >
            {def.label}
          </h2>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "0.9375rem",
              color: "var(--ink2)",
              margin: 0,
            }}
          >
            {def.subtitle}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              style={rangeStyle(option === range)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {gap && latestA && latestB && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 24,
            padding: "16px 18px",
            border: "1px solid var(--gap-ln)",
            borderRadius: 8,
            background: "var(--gap-bg)",
            marginBottom: 18,
          }}
        >
          {[
            { leg: legA, latest: latestA, color: seriesColor(0) },
            { leg: legB, latest: latestB, color: seriesColor(1) },
          ].map(({ leg, latest, color }) => (
            <div
              key={`${leg.code}-${leg.source}`}
              style={{ display: "flex", flexDirection: "column", gap: 3 }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: MONO,
                  fontSize: "0.68rem",
                  color: "var(--ink2)",
                  fontWeight: 600,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                {leg.label}
              </span>
              <span
                style={{
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: "1.375rem",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {def.format(latest.value)}
              </span>
              <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--ink3)" }}>
                {sourceLabel(leg.source)} · {formatDateAR(latest.date)}
              </span>
            </div>
          ))}
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div
              style={{
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: "1.875rem",
                lineHeight: 1,
                color: "var(--gap)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {gap.formattedGap}
            </div>
            <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--ink3)" }}>brecha actual</span>
          </div>
        </div>
      )}

      {hasSeries ? (
        <AnnotatedSeriesChart
          series={chartSeries}
          events={chartEvents}
          gapFill
          yFormat={(value) => def.format(value)}
          xLabels={xLabels}
          height={320}
        />
      ) : (
        <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink2)", margin: 0 }}>
          No hay suficiente serie en el rango seleccionado para graficar esta brecha.
        </p>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginTop: 16,
          paddingTop: 16,
          borderTop: "1px solid var(--line)",
        }}
      >
        {[legA, legB].map((leg) => (
          <div
            key={`${leg.code}-${leg.source}`}
            style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--ink3)", lineHeight: 1.5 }}
          >
            <b style={{ color: "var(--ink2)" }}>
              {leg.historySource
                ? `${leg.label} — ${sourceLabel(leg.source)} + ${sourceLabel(leg.historySource)}`
                : `${leg.label} — ${sourceLabel(leg.source)}`}
            </b>
            {" · "}
            {SOURCE_METHODOLOGY[leg.source] ?? "Fuente oficial; ver publicación original."}
          </div>
        ))}
      </div>
    </div>
  );
}
