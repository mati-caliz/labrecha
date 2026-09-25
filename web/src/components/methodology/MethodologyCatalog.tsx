"use client";
import type { ReactElement } from "react";

import { QueryError } from "@/components/QueryError";
import { Skeleton } from "@/components/ui/skeleton";
import { useIndicators } from "@/hooks/useLabrecha";
import { freshnessForCode } from "@/lib/freshness";
import {
  CADENCE_LABELS,
  INDICATOR_FAMILY_LABELS,
  INDICATOR_FAMILY_ORDER,
  type IndicatorFamily,
  SOURCE_METHODOLOGY,
  cadenceForCode,
  formatDateAR,
  formatNumberAR,
  getIndicatorDisplay,
  getIndicatorMeta,
  sourceLabel,
} from "@/lib/indicators";
import type { IndicatorSummary } from "@/lib/labrechaApi";
import Link from "next/link";
import { hasText } from "@/lib/utils";

const MONO = "var(--font-jb-mono)";
const SKELETON_KEYS = ["m1", "m2", "m3", "m4"];

function IndicatorRow({ indicator }: Readonly<{ indicator: IndicatorSummary }>): ReactElement {
  const display = getIndicatorDisplay(indicator.indicator_code);
  const cadence = cadenceForCode(indicator.indicator_code);
  const freshness = freshnessForCode(indicator.indicator_code, indicator.last_date);
  const isComparator = indicator.sources.length > 1;

  return (
    <div style={{ padding: "18px 0", borderTop: "1px solid var(--line)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Link
          href={display.href}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "1.0625rem",
            color: "var(--ink)",
            textDecoration: "none",
          }}
        >
          {display.label}
          {isComparator ? <span style={{ color: "var(--gap)", marginLeft: 8 }}>◆</span> : null}
        </Link>
        <span style={{ fontFamily: MONO, fontSize: "0.66rem", color: "var(--ink3)" }}>
          {indicator.indicator_code}
        </span>
      </div>

      <div
        style={{
          fontFamily: MONO,
          fontSize: "0.68rem",
          color: "var(--ink3)",
          margin: "8px 0 10px",
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <span>cadencia {CADENCE_LABELS[cadence]}</span>
        <span>
          {formatNumberAR(indicator.count)} {indicator.count === 1 ? "dato" : "datos"}
        </span>
        <span>
          {formatDateAR(indicator.first_date)} → {formatDateAR(indicator.last_date)}
        </span>
        <span style={{ color: freshness.stale ? "var(--gap)" : "var(--pos)" }}>
          {freshness.stale
            ? `⚠ sin actualizar hace ${freshness.days} días`
            : `al día (hace ${freshness.days} días)`}
        </span>
        {hasText(display.unit) ? <span>en {display.unit}</span> : null}
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
        {indicator.sources.map((source) => (
          <li
            key={source}
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "0.875rem",
              color: "var(--ink2)",
              lineHeight: 1.45,
            }}
          >
            <b style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--ink)" }}>
              {sourceLabel(source)}
            </b>{" "}
            — {SOURCE_METHODOLOGY[source] ?? "Fuente sin nota metodológica cargada."}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MethodologyCatalog(): ReactElement {
  const { data, isLoading, isError, error, refetch } = useIndicators();

  if (isError) {
    return (
      <QueryError
        error={error}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-24 w-full rounded-[10px]" />
        ))}
      </div>
    );
  }

  const indicators = data ?? [];
  const byFamily = new Map<IndicatorFamily, IndicatorSummary[]>();
  for (const indicator of indicators) {
    const family = getIndicatorMeta(indicator.indicator_code)?.family ?? "precios";
    byFamily.set(family, [...(byFamily.get(family) ?? []), indicator]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
      {INDICATOR_FAMILY_ORDER.map((family) => {
        const group = byFamily.get(family) ?? [];
        if (group.length === 0) {
          return null;
        }
        return (
          <section key={family}>
            <h3
              style={{
                fontFamily: MONO,
                fontSize: "0.72rem",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--ink3)",
                borderBottom: "2px solid var(--ink)",
                paddingBottom: 10,
                margin: 0,
              }}
            >
              {INDICATOR_FAMILY_LABELS[family]}
            </h3>
            {group.map((indicator) => (
              <IndicatorRow key={indicator.indicator_code} indicator={indicator} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
