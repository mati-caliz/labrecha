"use client";
import type { ReactElement } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useIndicatorTerms } from "@/hooks/useLabrecha";
import { formatDateAR, formatNumberAR, getIndicatorDisplay, sourceLabel } from "@/lib/indicators";
import type { IndicatorTermStat, TermMethod } from "@/lib/labrechaApi";

const MONO = "var(--font-jb-mono)";
const MIN_POINTS = 2;
const FULL_BAR_PERCENT = 100;

const METHOD_NOTE: Record<TermMethod, string> = {
  COMPOUNDED:
    "Variación acumulada del período, componiendo las tasas mensuales (no es la suma de los meses).",
  ENDPOINTS: "Variación entre el primer y el último dato disponible dentro de cada mandato.",
};

function changeColor(change: number, goodWhen: "up" | "down" | "neutral"): string {
  if (change === 0 || goodWhen === "neutral") {
    return "var(--ink2)";
  }
  const good = goodWhen === "up" ? change > 0 : change < 0;
  return good ? "var(--pos)" : "var(--neg)";
}

function TermRow({
  term,
  code,
  widest,
}: Readonly<{ term: IndicatorTermStat; code: string; widest: number }>): ReactElement {
  const indicator = getIndicatorDisplay(code);
  const change = Number.parseFloat(term.change_pct);
  const annualized = term.annualized_pct === null ? null : Number.parseFloat(term.annualized_pct);
  const barWidth = widest === 0 ? 0 : (Math.abs(change) / widest) * FULL_BAR_PERCENT;
  const color = changeColor(change, indicator.goodWhen);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(150px, 1.1fr) minmax(120px, 2fr) minmax(110px, auto)",
        alignItems: "center",
        gap: 20,
        padding: "16px 0",
        borderTop: "1px solid var(--line)",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "0.9375rem",
            color: "var(--ink)",
          }}
        >
          {term.president}
        </div>
        <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--ink3)", marginTop: 4 }}>
          {formatDateAR(term.first_date)} → {formatDateAR(term.last_date)}
        </div>
      </div>

      <div>
        <div
          style={{
            height: 10,
            background: "var(--line2)",
            borderRadius: "var(--radius-pill)",
            overflow: "hidden",
          }}
        >
          <div style={{ width: `${barWidth}%`, height: "100%", background: color, opacity: 0.85 }} />
        </div>
        <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--ink3)", marginTop: 6 }}>
          {indicator.format(Number.parseFloat(term.first_value))} →{" "}
          {indicator.format(Number.parseFloat(term.last_value))}
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: "1.125rem",
            color,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {change > 0 ? "+" : ""}
          {formatNumberAR(change, 1)} %
        </div>
        {annualized === null ? null : (
          <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--ink3)" }}>
            {formatNumberAR(annualized, 1)} % anualizado
          </div>
        )}
      </div>
    </div>
  );
}

export function TermBreakdown({
  code,
  source,
}: Readonly<{ code: string; source?: string | undefined }>): ReactElement | null {
  const { data, isLoading } = useIndicatorTerms(code, source === undefined ? undefined : { source });

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-[10px]" />;
  }

  const terms = (data?.terms ?? []).filter((term) => term.points >= MIN_POINTS);
  if (terms.length === 0 || data === undefined) {
    return null;
  }

  const widest = terms.reduce((max, term) => Math.max(max, Math.abs(Number.parseFloat(term.change_pct))), 0);

  return (
    <section style={{ marginTop: 44 }}>
      <div style={{ borderBottom: "2px solid var(--ink)", paddingBottom: 14, marginBottom: 4 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: "0.66rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink3)",
            marginBottom: 8,
          }}
        >
          Por gestión de gobierno
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(1.25rem, 3vw, 1.625rem)",
            letterSpacing: "-0.02em",
            margin: 0,
            color: "var(--ink)",
          }}
        >
          Cómo se movió en cada mandato
        </h2>
      </div>

      {terms.map((term) => (
        <TermRow key={term.term_id} term={term} code={code} widest={widest} />
      ))}

      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "0.875rem",
          color: "var(--ink3)",
          marginTop: 16,
          borderTop: "1px solid var(--line)",
          paddingTop: 14,
        }}
      >
        {METHOD_NOTE[data.method]} Fuente: {sourceLabel(data.source)}. Cada mandato se recorta a los datos
        efectivamente disponibles, que pueden empezar después de la asunción.
      </p>
    </section>
  );
}
