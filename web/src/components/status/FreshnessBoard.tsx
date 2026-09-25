"use client";

import { QueryError } from "@/components/QueryError";
import { Skeleton } from "@/components/ui/skeleton";
import { useIndicators } from "@/hooks/useLabrecha";
import { MAX_AGE_DAYS, freshnessForCode } from "@/lib/freshness";
import { formatDateAR, formatNumberAR, getIndicatorDisplay, sourceLabel } from "@/lib/indicators";
import type { IndicatorSummary } from "@/lib/labrechaApi";
import Link from "next/link";

const MONO = "var(--font-jb-mono)";
const LATE_RATIO = 0.6;
const SKELETON_KEYS = ["f1", "f2", "f3", "f4", "f5"];

type Health = "ok" | "late" | "stale";

const HEALTH_STYLE: Record<Health, { color: string; label: string }> = {
  ok: { color: "var(--pos)", label: "al día" },
  late: { color: "var(--gap)", label: "demorada" },
  stale: { color: "var(--neg)", label: "congelada" },
};

interface Row {
  indicator: IndicatorSummary;
  health: Health;
  days: number;
  cadence: string;
  limit: number;
}

function buildRow(indicator: IndicatorSummary): Row {
  const freshness = freshnessForCode(indicator.indicator_code, indicator.last_date);
  const limit = MAX_AGE_DAYS[freshness.cadence];
  const health: Health = freshness.stale ? "stale" : freshness.days > limit * LATE_RATIO ? "late" : "ok";
  return { indicator, health, days: freshness.days, cadence: freshness.cadence, limit };
}

function HealthRow({ row }: { row: Row }) {
  const display = getIndicatorDisplay(row.indicator.indicator_code);
  const style = HEALTH_STYLE[row.health];
  const usage = Math.min((row.days / row.limit) * 100, 100);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(160px, 1.4fr) minmax(90px, 1fr) minmax(120px, auto)",
        alignItems: "center",
        gap: 16,
        padding: "12px 0",
        borderTop: "1px solid var(--line)",
      }}
    >
      <div>
        <Link
          href={display.href}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "0.9375rem",
            color: "var(--ink)",
            textDecoration: "none",
          }}
        >
          {display.label}
        </Link>
        <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--ink3)", marginTop: 3 }}>
          {row.indicator.sources.map(sourceLabel).join(" · ")} · cadencia {row.cadence}
        </div>
      </div>

      <div>
        <div
          style={{
            height: 6,
            background: "var(--line2)",
            borderRadius: "var(--radius-pill)",
            overflow: "hidden",
          }}
        >
          <div style={{ width: `${usage}%`, height: "100%", background: style.color }} />
        </div>
        <div style={{ fontFamily: MONO, fontSize: "0.6rem", color: "var(--ink3)", marginTop: 4 }}>
          último dato {formatDateAR(row.indicator.last_date)}
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: "0.68rem",
            fontWeight: 600,
            color: style.color,
          }}
        >
          ● {style.label}
        </span>
        <div style={{ fontFamily: MONO, fontSize: "0.6rem", color: "var(--ink3)" }}>
          hace {formatNumberAR(row.days)} d · tolerancia {row.limit} d
        </div>
      </div>
    </div>
  );
}

export function FreshnessBoard() {
  const { data, isLoading, isError, error, refetch } = useIndicators();

  if (isError) {
    return <QueryError error={error} onRetry={() => refetch()} />;
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-12 w-full rounded-[8px]" />
        ))}
      </div>
    );
  }

  const rows = (data ?? []).map(buildRow).sort((first, second) => {
    const order: Record<Health, number> = { stale: 0, late: 1, ok: 2 };
    return order[first.health] - order[second.health] || second.days - first.days;
  });

  if (rows.length === 0) {
    return null;
  }

  const counts: Record<Health, number> = { ok: 0, late: 0, stale: 0 };
  for (const row of rows) {
    counts[row.health] += 1;
  }

  return (
    <section>
      <header style={{ borderBottom: "2px solid var(--ink)", paddingBottom: 12, marginBottom: 4 }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(1.25rem, 3vw, 1.625rem)",
            letterSpacing: "-0.02em",
            margin: "0 0 8px",
            color: "var(--ink)",
          }}
        >
          Frescura de cada serie
        </h2>
        <div style={{ fontFamily: MONO, fontSize: "0.7rem", color: "var(--ink3)" }}>
          <span style={{ color: HEALTH_STYLE.ok.color }}>● {counts.ok} al día</span>
          {" · "}
          <span style={{ color: HEALTH_STYLE.late.color }}>● {counts.late} demoradas</span>
          {" · "}
          <span style={{ color: HEALTH_STYLE.stale.color }}>● {counts.stale} congeladas</span>
        </div>
      </header>

      {rows.map((row) => (
        <HealthRow key={row.indicator.indicator_code} row={row} />
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
        La tolerancia sale de la cadencia esperada de cada serie: una diaria se considera congelada mucho
        antes que una anual. Un dato viejo se muestra igual, con su fecha; nunca se completa ni se estima.
      </p>
    </section>
  );
}
