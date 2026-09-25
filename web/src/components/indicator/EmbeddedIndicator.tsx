"use client";
import type { ReactElement } from "react";

import { AnnotatedSeriesChart } from "@/components/core";
import { formatDateAR, getIndicatorDisplay, sourceLabel } from "@/lib/indicators";
import type { IndicatorPoint } from "@/lib/labrechaApi";
import { SITE_URL } from "@/lib/site";
import { hasText } from "@/lib/utils";

const MONO = "var(--font-jb-mono)";
const CHART_HEIGHT = 180;
const MAX_X_LABELS = 5;
const DAY_MONTH_LENGTH = 5;

export function EmbeddedIndicator({
  code,
  points,
}: Readonly<{ code: string; points: IndicatorPoint[] }>): ReactElement {
  const indicator = getIndicatorDisplay(code);
  const values = points
    .map((point) => ({ date: point.date, source: point.source, v: Number.parseFloat(point.value) }))
    .filter((point) => Number.isFinite(point.v));
  const latest = values[values.length - 1];

  const step = Math.max(1, Math.ceil(values.length / MAX_X_LABELS));
  const xLabels = values.map((point, index) =>
    index % step === 0 ? formatDateAR(point.date).slice(0, DAY_MONTH_LENGTH) : "",
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 16,
        background: "var(--bg)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span
          style={{
            font: "var(--fw-bold) 1.0625rem/1.2 var(--font-display)",
            color: "var(--ink)",
          }}
        >
          {indicator.label}
        </span>
        {latest === undefined ? null : (
          <span
            style={{
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: "1.0625rem",
              color: "var(--ink)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {indicator.format(latest.v)}
            {hasText(indicator.unit) ? ` ${indicator.unit}` : ""}
          </span>
        )}
      </div>

      {values.length === 0 ? (
        <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink2)", margin: 0 }}>
          Sin datos para mostrar.
        </p>
      ) : (
        <AnnotatedSeriesChart
          height={CHART_HEIGHT}
          xLabels={xLabels}
          yFormat={(value) => indicator.format(value)}
          series={[{ name: indicator.label, data: values.map((point) => ({ v: point.v })) }]}
        />
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          fontFamily: MONO,
          fontSize: "0.66rem",
          color: "var(--ink3)",
        }}
      >
        <span>
          {latest === undefined
            ? "Sin fuente"
            : `Fuente ${sourceLabel(latest.source)} · ${formatDateAR(latest.date)}`}
        </span>
        <a
          href={`${SITE_URL}/indicador/${code}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--gap)", textDecoration: "none" }}
        >
          La Brecha ↗
        </a>
      </div>
    </div>
  );
}
