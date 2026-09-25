"use client";
import type { ReactElement } from "react";

import { AnnotatedSeriesChart } from "@/components/core";
import { Skeleton } from "@/components/ui/skeleton";
import { useGapHistory } from "@/hooks/useLabrecha";
import { automaticGapMagnitude } from "@/lib/gaps";
import { formatDateAR, formatNumberAR, sourceLabel } from "@/lib/indicators";
import type { GapHistoryPoint } from "@/lib/labrechaApi";

const MONO = "var(--font-jb-mono)";
const CHART_HEIGHT = 200;
const MAX_X_LABELS = 6;
const DAY_MONTH_LENGTH = 5;

function spreadOf(point: GapHistoryPoint): number {
  return Math.abs(Number.parseFloat(point.spread));
}

function Milestone({
  caption,
  point,
  unit,
  emphasis,
}: Readonly<{
  caption: string;
  point: GapHistoryPoint;
  unit: string;
  emphasis: boolean;
}>): ReactElement {
  const magnitude = automaticGapMagnitude(unit, Number.parseFloat(point.spread), point.gap_pct);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontFamily: MONO,
          fontSize: "0.66rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink3)",
        }}
      >
        {caption}
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: "1.35rem",
          color: emphasis ? "var(--gap)" : "var(--ink)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {magnitude.headline}
      </span>
      <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--ink3)" }}>
        {formatDateAR(point.date)} · {sourceLabel(point.higher_source)} vs {sourceLabel(point.lower_source)}
      </span>
    </div>
  );
}

function xLabels(points: GapHistoryPoint[]): string[] {
  const step = Math.max(1, Math.ceil(points.length / MAX_X_LABELS));
  return points.map((point, index) =>
    index % step === 0 ? formatDateAR(point.date).slice(0, DAY_MONTH_LENGTH) : "",
  );
}

export function GapHistory({ code }: Readonly<{ code: string }>): ReactElement | null {
  const { data, isLoading, isError } = useGapHistory(code);

  if (isLoading) {
    return <Skeleton className="h-[260px] rounded-[10px]" />;
  }
  if (isError || !data || data.points.length === 0) {
    return null;
  }

  const spreads = data.points.map(spreadOf);
  const series = [{ name: "Brecha entre fuentes", data: spreads.map((value) => ({ v: value })) }];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h2
          style={{
            font: "var(--fw-bold) var(--fs-h2)/var(--lh-heading) var(--font-display)",
            color: "var(--ink)",
            margin: 0,
          }}
        >
          La brecha en el tiempo
        </h2>
        <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink2)", margin: 0 }}>
          Cuánto se separaron las fuentes que miden este indicador, en cada fecha en que midieron las dos.{" "}
          {data.points.length} fechas comparables desde {formatDateAR(data.points[0]?.date ?? "")}.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 28,
          padding: "16px 18px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--line)",
          background: "var(--raise)",
        }}
      >
        <Milestone caption="La más ancha" point={data.widest} unit={data.unit} emphasis />
        <Milestone caption="La más angosta" point={data.narrowest} unit={data.unit} emphasis={false} />
        <Milestone caption="La última" point={data.latest} unit={data.unit} emphasis={false} />
      </div>

      <AnnotatedSeriesChart
        series={series}
        height={CHART_HEIGHT}
        xLabels={xLabels(data.points)}
        yFormat={(value) => `${formatNumberAR(value, 2)}${data.unit === "%" ? " pp" : ""}`}
      />
    </section>
  );
}
