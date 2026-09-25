"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useLegLatest } from "@/hooks/useLabrecha";
import { GAPS, computeGap } from "@/lib/gaps";
import { INDICATOR_FAMILY_LABELS, formatDateAR, getIndicatorMeta, sourceLabel } from "@/lib/indicators";
import Link from "next/link";

const MONO = "var(--font-jb-mono)";

const LEGS = GAPS.flatMap((gap) => gap.legs.map((leg) => ({ code: leg.code, source: leg.source })));

interface RankedGap {
  id: string;
  familyLabel: string;
  label: string;
  legALabel: string;
  legBLabel: string;
  valueAText: string;
  valueBText: string;
  sourcesText: string;
  formattedGap: string;
  gapMagnitude: number;
  barWidth: number;
}

export function GapRankList() {
  const queries = useLegLatest(LEGS);
  const isLoading = queries.some((query) => query.isLoading);

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {GAPS.map((gap) => (
          <Skeleton key={gap.id} className="h-[110px] rounded-[10px]" />
        ))}
      </div>
    );
  }

  const ranked: RankedGap[] = [];
  GAPS.forEach((def, index) => {
    const pointA = queries[index * 2]?.data?.points?.[0];
    const pointB = queries[index * 2 + 1]?.data?.points?.[0];
    if (!pointA || !pointB) {
      return;
    }
    const valueA = Number.parseFloat(pointA.value);
    const valueB = Number.parseFloat(pointB.value);
    if (!Number.isFinite(valueA) || !Number.isFinite(valueB)) {
      return;
    }
    const gap = computeGap(def, valueA, valueB);
    const family = getIndicatorMeta(def.legs[0].code)?.family;
    ranked.push({
      id: def.id,
      familyLabel: family ? INDICATOR_FAMILY_LABELS[family] : "Indicador",
      label: def.label,
      legALabel: def.legs[0].label,
      legBLabel: def.legs[1].label,
      valueAText: def.format(valueA),
      valueBText: def.format(valueB),
      sourcesText: `${sourceLabel(def.legs[0].source)} · ${sourceLabel(def.legs[1].source)} · ${formatDateAR(pointA.date > pointB.date ? pointA.date : pointB.date)}`,
      formattedGap: gap.formattedGap,
      gapMagnitude: gap.magnitude,
      barWidth: gap.barWidth,
    });
  });
  ranked.sort((a, b) => b.gapMagnitude - a.gapMagnitude);

  if (ranked.length === 0) {
    return (
      <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink2)" }}>
        No hay datos suficientes para calcular las brechas en este momento.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--ink3)" }}>
        {ranked.length} brechas activas · ordenadas por magnitud
      </span>
      {ranked.map((gap, index) => {
        const strong = index < 3;
        return (
          <Link
            key={gap.id}
            href={`#${gap.id}`}
            className="lb-gap-row"
            style={{
              alignItems: "center",
              gap: 24,
              background: "var(--raise)",
              border: `1px solid ${strong ? "var(--gap-ln)" : "var(--line)"}`,
              borderRadius: 10,
              padding: "22px 26px",
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
              {String(index + 1).padStart(2, "0")}
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
                {gap.familyLabel}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "1.375rem",
                  letterSpacing: "-0.015em",
                  color: "var(--ink)",
                }}
              >
                {gap.label}
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
                  {gap.legALabel} <b style={{ color: "var(--ink)" }}>{gap.valueAText}</b>
                </span>
                <span style={{ color: "var(--ink2)" }}>
                  {gap.legBLabel} <b style={{ color: "var(--ink)" }}>{gap.valueBText}</b>
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
                    width: `${gap.barWidth}%`,
                    height: "100%",
                    background: "var(--gap)",
                    opacity: 0.9,
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: "0.62rem",
                  color: "var(--ink3)",
                  marginTop: 6,
                }}
              >
                {gap.sourcesText}
              </div>
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
                {gap.formattedGap}
              </div>
              <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--ink3)" }}>de brecha</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
