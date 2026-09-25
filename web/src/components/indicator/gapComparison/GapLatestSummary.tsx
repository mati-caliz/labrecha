"use client";
import type { ReactElement } from "react";

import type { GapDef, GapLeg, GapResult } from "@/lib/gaps";
import { formatDateAR, sourceLabel } from "@/lib/indicators";
import type { ParsedPoint } from "@/lib/series";

const MONO = "var(--font-jb-mono)";

export interface LegReading {
  leg: GapLeg;
  latest: ParsedPoint;
  color: string;
}

function LegLatest({ def, reading }: Readonly<{ def: GapDef; reading: LegReading }>): ReactElement {
  const { leg, latest, color } = reading;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
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
  );
}

export function GapLatestSummary({
  def,
  gap,
  readings,
}: Readonly<{ def: GapDef; gap: GapResult; readings: LegReading[] }>): ReactElement {
  return (
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
      {readings.map((reading) => (
        <LegLatest key={`${reading.leg.code}-${reading.leg.source}`} def={def} reading={reading} />
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
  );
}
