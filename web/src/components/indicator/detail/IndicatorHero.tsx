"use client";
import type { ReactElement } from "react";

import { MONO, sourceColor } from "@/components/indicator/detail/styles";
import type { VariationDisplay } from "@/components/indicator/detail/variation";
import { type IndicatorDisplay, formatDateAR, sourceLabel } from "@/lib/indicators";
import type { IndicatorSourceSummary } from "@/lib/labrechaApi";
import { hasText } from "@/lib/utils";

function SourceChipDot({
  source,
  date,
  color,
}: Readonly<{ source: string; date: string; color: string }>): ReactElement {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: MONO,
        fontSize: "0.72rem",
        color: "var(--ink2)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-pill)",
        padding: "5px 12px",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      {source} · {date}
    </span>
  );
}

export function IndicatorHero({
  code,
  familyLabel,
  indicator,
  primaryValue,
  stepVariation,
  sources,
  stale,
}: Readonly<{
  code: string;
  familyLabel: string;
  indicator: IndicatorDisplay;
  primaryValue: number | undefined;
  stepVariation: VariationDisplay | undefined;
  sources: IndicatorSourceSummary[];
  stale: boolean;
}>): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 32,
        flexWrap: "wrap",
        borderBottom: "2px solid var(--ink)",
        paddingBottom: 24,
        marginBottom: 28,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: "0.72rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--ink3)",
            marginBottom: 12,
          }}
        >
          {familyLabel} · /indicador/{code}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(2rem, 5vw, 2.875rem)",
            lineHeight: 1.0,
            letterSpacing: "-0.025em",
            margin: "0 0 18px",
            color: "var(--ink)",
          }}
        >
          {indicator.label}
        </h1>
        {primaryValue !== undefined && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 18, flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: "clamp(2.25rem, 6vw, 3.25rem)",
                lineHeight: 0.85,
                letterSpacing: "-0.03em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {indicator.format(primaryValue)}
              {hasText(indicator.unit) ? (
                <span style={{ fontSize: "0.5em", color: "var(--ink3)" }}> {indicator.unit}</span>
              ) : null}
            </span>
            {stepVariation ? (
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: stepVariation.color,
                  background: stepVariation.background,
                  padding: "4px 9px",
                  borderRadius: 5,
                  marginBottom: 6,
                }}
              >
                {stepVariation.text}
              </span>
            ) : null}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
        {sources.map((source, index) => (
          <SourceChipDot
            key={source.source}
            source={sourceLabel(source.source)}
            date={formatDateAR(source.last_date)}
            color={sourceColor(index)}
          />
        ))}
        {stale ? (
          <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--gap)" }}>
            ⚠ dato desactualizado
          </span>
        ) : null}
      </div>
    </div>
  );
}
