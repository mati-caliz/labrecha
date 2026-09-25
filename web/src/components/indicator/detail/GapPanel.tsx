"use client";
import type { ReactElement } from "react";

import { CARD_STYLE, MONO, sourceColor } from "@/components/indicator/detail/styles";
import { GAPS } from "@/lib/gaps";
import { type IndicatorDisplay, SOURCE_METHODOLOGY, formatNumberAR, sourceLabel } from "@/lib/indicators";
import type { IndicatorSourceSummary } from "@/lib/labrechaApi";
import Link from "next/link";

export function GapPanel({
  indicator,
  gapPct,
  sources,
}: Readonly<{
  indicator: IndicatorDisplay;
  gapPct: number;
  sources: IndicatorSourceSummary[];
}>): ReactElement | null {
  const [firstSource, secondSource] = sources;
  if (!firstSource || !secondSource) {
    return null;
  }
  return (
    <div
      style={{
        background: "var(--gap-bg)",
        border: "1px solid var(--gap-ln)",
        borderRadius: 10,
        padding: "28px 30px",
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: "0.72rem",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--gap)",
          marginBottom: 20,
        }}
      >
        ◆ La brecha entre fuentes
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: "clamp(2.75rem, 8vw, 4rem)",
            lineHeight: 0.8,
            color: "var(--gap)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatNumberAR(gapPct, 1)}%
        </span>
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.0625rem",
            color: "var(--ink2)",
            lineHeight: 1.35,
          }}
        >
          de diferencia entre {sourceLabel(firstSource.source)} y {sourceLabel(secondSource.source)} hoy.
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {sources.slice(0, 2).map((source, index) => (
          <div
            key={source.source}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--raise)",
              padding: "14px 16px",
              borderRadius: index === 0 ? "7px 7px 0 0" : "0 0 7px 7px",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: sourceColor(index),
              }}
            />
            <span style={{ fontFamily: MONO, fontSize: "0.78rem", color: "var(--ink2)", flex: 1 }}>
              {sourceLabel(source.source)}
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontWeight: 600,
                fontSize: "1.125rem",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {indicator.format(Number.parseFloat(source.latest_value))}
            </span>
          </div>
        ))}
      </div>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "0.9rem",
          lineHeight: 1.5,
          color: "var(--ink2)",
          margin: "18px 0 0",
        }}
      >
        {SOURCE_METHODOLOGY[firstSource.source] ?? "Cada fuente publica con su propia metodología y rezago."}
      </p>
    </div>
  );
}

export function SourcePanel({
  primary,
}: Readonly<{ primary: IndicatorSourceSummary | undefined }>): ReactElement {
  return (
    <div style={{ ...CARD_STYLE, padding: "28px 30px" }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: "0.72rem",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--ink3)",
          marginBottom: 14,
        }}
      >
        Fuente
      </div>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "1rem",
          lineHeight: 1.5,
          color: "var(--ink2)",
          margin: 0,
        }}
      >
        {primary
          ? (SOURCE_METHODOLOGY[primary.source] ?? `Serie publicada por ${sourceLabel(primary.source)}.`)
          : "Sin datos de fuente."}
      </p>
    </div>
  );
}

export function RelatedGapLinks({ code }: Readonly<{ code: string }>): ReactElement | null {
  const relatedGaps = GAPS.filter((gap) => gap.legs.some((leg) => leg.code === code));
  if (relatedGaps.length === 0) {
    return null;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
      {relatedGaps.map((gap) => (
        <Link
          key={gap.id}
          href={`/brechas#${gap.id}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--gap-ln)",
            background: "var(--gap-bg)",
            textDecoration: "none",
            color: "var(--gap)",
            fontFamily: MONO,
            fontSize: "0.75rem",
          }}
        >
          ◆ {gap.label} →
        </Link>
      ))}
    </div>
  );
}
