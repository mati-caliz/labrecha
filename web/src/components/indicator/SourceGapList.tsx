"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useSourceGaps } from "@/hooks/useLabrecha";
import { automaticGapMagnitude } from "@/lib/gaps";
import {
  INDICATOR_FAMILY_LABELS,
  formatDateAR,
  getIndicatorDisplay,
  getIndicatorMeta,
  sourceLabel,
} from "@/lib/indicators";
import type { SourceGap } from "@/lib/labrechaApi";
import Link from "next/link";

const MONO = "var(--font-jb-mono)";
const SKELETON_KEYS = ["g1", "g2", "g3"];

function GapRow({ gap, position }: { gap: SourceGap; position: number }) {
  const indicator = getIndicatorDisplay(gap.indicator_code);
  const meta = getIndicatorMeta(gap.indicator_code);
  const familyLabel = meta ? INDICATOR_FAMILY_LABELS[meta.family] : "Indicador";
  const higher = Number.parseFloat(gap.higher_value);
  const lower = Number.parseFloat(gap.lower_value);
  const magnitude = automaticGapMagnitude(gap.unit, Number.parseFloat(gap.spread), gap.gap_pct);
  const strong = position < 3;

  return (
    <Link
      href={indicator.href}
      className="lb-gap-row"
      style={{
        alignItems: "center",
        gap: 24,
        background: "var(--raise)",
        border: `1px solid ${strong ? "var(--gap-ln)" : "var(--line)"}`,
        borderRadius: 10,
        padding: "20px 24px",
        textDecoration: "none",
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: "1.25rem",
          color: strong ? "var(--gap)" : "var(--ink3)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {String(position + 1).padStart(2, "0")}
      </span>

      <div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: "0.66rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink3)",
            marginBottom: 7,
          }}
        >
          {familyLabel}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1.25rem",
            letterSpacing: "-0.015em",
            color: "var(--ink)",
          }}
        >
          {indicator.label}
        </div>
      </div>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: MONO,
            fontSize: "0.72rem",
            marginBottom: 8,
            gap: 10,
          }}
        >
          <span style={{ color: "var(--ink2)" }}>
            {sourceLabel(gap.higher_source)} <b style={{ color: "var(--ink)" }}>{indicator.format(higher)}</b>
          </span>
          <span style={{ color: "var(--ink2)" }}>
            {sourceLabel(gap.lower_source)} <b style={{ color: "var(--ink)" }}>{indicator.format(lower)}</b>
          </span>
        </div>
        <div
          style={{
            height: 8,
            background: "var(--line2)",
            borderRadius: "var(--radius-pill)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${magnitude.barWidth}%`,
              height: "100%",
              background: "var(--gap)",
              opacity: 0.9,
            }}
          />
        </div>
        <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--ink3)", marginTop: 6 }}>
          {gap.measurements.length} fuentes con la misma unidad ({gap.unit}) en la misma fecha ·{" "}
          {formatDateAR(gap.date)}
        </div>
        {gap.excluded_sources.length > 0 && (
          <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--ink3)", marginTop: 4 }}>
            fuera de la comparación:{" "}
            {gap.excluded_sources
              .map((excluded) => `${sourceLabel(excluded.source)} (${excluded.reason})`)
              .join(" · ")}
          </div>
        )}
      </div>

      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: "2rem",
            color: "var(--gap)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {magnitude.headline}
        </div>
        <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--ink3)" }}>{magnitude.caption}</div>
      </div>
    </Link>
  );
}

export function SourceGapList() {
  const { data, isLoading } = useSourceGaps();

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-[104px] rounded-[10px]" />
        ))}
      </div>
    );
  }

  const gaps = data ?? [];
  if (gaps.length === 0) {
    return (
      <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink2)" }}>
        Todavía no hay ningún indicador con dos fuentes que hayan medido la misma fecha.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--ink3)" }}>
        {gaps.length} {gaps.length === 1 ? "indicador medido" : "indicadores medidos"} por más de una fuente ·
        ordenados por discrepancia
      </span>
      {gaps.map((gap, index) => (
        <GapRow key={gap.indicator_code} gap={gap} position={index} />
      ))}
    </div>
  );
}
