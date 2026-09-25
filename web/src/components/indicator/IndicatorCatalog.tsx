"use client";

import { QueryError } from "@/components/QueryError";
import { Skeleton } from "@/components/ui/skeleton";
import { useIndicators } from "@/hooks/useLabrecha";
import { freshnessForCode } from "@/lib/freshness";
import {
  INDICATOR_FAMILY_LABELS,
  INDICATOR_FAMILY_ORDER,
  type IndicatorFamily,
  formatDateAR,
  getIndicatorMeta,
  indicatorLabel,
  sourceLabel,
} from "@/lib/indicators";
import type { IndicatorSummary } from "@/lib/labrechaApi";
import { type CSSProperties, useMemo, useState, type ReactElement } from "react";

const OTHER_FAMILY_LABEL = "Otros";
const ALL_FILTER = "Todos";
const MONO = "var(--font-jb-mono)";
const SKELETON_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];
const DIACRITICS = /\p{Diacritic}/gu;

interface FamilyGroup {
  key: string;
  label: string;
  items: IndicatorSummary[];
}

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(DIACRITICS, "");
}

function matchesQuery(indicator: IndicatorSummary, normalizedQuery: string): boolean {
  if (normalizedQuery.length === 0) {
    return true;
  }
  const haystack = normalize(`${indicator.indicator_code} ${indicatorLabel(indicator.indicator_code)}`);
  return haystack.includes(normalizedQuery);
}

function bucketByFamily(
  matches: IndicatorSummary[],
  family: IndicatorFamily | null,
): Map<string, IndicatorSummary[]> {
  const byFamily = new Map<string, IndicatorSummary[]>();
  for (const indicator of matches) {
    const itemFamily = getIndicatorMeta(indicator.indicator_code)?.family;
    if (family && itemFamily !== family) {
      continue;
    }
    const key = itemFamily ?? OTHER_FAMILY_LABEL;
    const bucket = byFamily.get(key) ?? [];
    bucket.push(indicator);
    byFamily.set(key, bucket);
  }
  return byFamily;
}

function orderedGroups(byFamily: Map<string, IndicatorSummary[]>): FamilyGroup[] {
  const groups: FamilyGroup[] = [];
  for (const familyKey of INDICATOR_FAMILY_ORDER) {
    const items = byFamily.get(familyKey);
    if (items && items.length > 0) {
      groups.push({ key: familyKey, label: INDICATOR_FAMILY_LABELS[familyKey], items });
    }
  }
  const others = byFamily.get(OTHER_FAMILY_LABEL);
  if (others && others.length > 0) {
    groups.push({ key: OTHER_FAMILY_LABEL, label: OTHER_FAMILY_LABEL, items: others });
  }
  return groups;
}

function groupByFamily(
  indicators: IndicatorSummary[],
  query: string,
  family: IndicatorFamily | null,
): FamilyGroup[] {
  const normalizedQuery = normalize(query.trim());
  const matches = indicators.filter((indicator) => matchesQuery(indicator, normalizedQuery));
  const groups = orderedGroups(bucketByFamily(matches, family));
  for (const group of groups) {
    group.items.sort((first, second) =>
      indicatorLabel(first.indicator_code).localeCompare(indicatorLabel(second.indicator_code), "es"),
    );
  }
  return groups;
}

const CARD_STYLE: CSSProperties = {
  background: "var(--raise)",
  border: "1px solid var(--line)",
  borderRadius: 9,
  padding: "18px 18px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  textDecoration: "none",
  color: "var(--ink)",
};

function CatalogCard({ indicator }: Readonly<{ indicator: IndicatorSummary }>): ReactElement {
  const isComparator = indicator.sources.length >= 2;
  const stale = freshnessForCode(indicator.indicator_code, indicator.last_date).stale;
  return (
    <a
      href={`/indicador/${indicator.indicator_code}`}
      style={{ ...CARD_STYLE, borderColor: isComparator ? "var(--gap-ln)" : "var(--line)" }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "1.0625rem",
          lineHeight: 1.15,
          letterSpacing: "-0.015em",
        }}
      >
        {indicatorLabel(indicator.indicator_code)}
      </div>
      <div style={{ fontFamily: MONO, fontSize: "0.66rem", color: "var(--ink3)" }}>
        {indicator.indicator_code}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
        {indicator.sources.map((source) => (
          <span
            key={source}
            style={{
              fontFamily: MONO,
              fontSize: "0.62rem",
              fontWeight: 600,
              color: "var(--ink2)",
              border: "1px solid var(--line)",
              borderRadius: 5,
              padding: "2px 8px",
            }}
          >
            {sourceLabel(source)}
          </span>
        ))}
        {isComparator && (
          <span
            style={{
              fontFamily: MONO,
              fontSize: "0.62rem",
              fontWeight: 600,
              color: "var(--gap)",
              background: "var(--gap-bg)",
              border: "1px solid var(--gap-ln)",
              borderRadius: 5,
              padding: "2px 8px",
            }}
          >
            ◆ comparador
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: "0.66rem",
          color: stale ? "var(--gap)" : "var(--ink3)",
          paddingTop: 6,
          borderTop: "1px solid var(--line2)",
        }}
      >
        {indicator.count.toLocaleString("es-AR")} datos · {formatDateAR(indicator.last_date)}
        {stale ? " · ⚠" : ""}
      </div>
    </a>
  );
}

const filterStyle = (active: boolean): CSSProperties => ({
  fontFamily: MONO,
  fontSize: "0.72rem",
  padding: "9px 14px",
  borderRadius: "var(--radius-pill)",
  cursor: "pointer",
  border: active ? "1px solid var(--ink)" : "1px solid var(--line)",
  background: active ? "var(--ink)" : "transparent",
  color: active ? "var(--paper)" : "var(--ink2)",
});

function FamilyGroupSection({ group }: Readonly<{ group: FamilyGroup }>): ReactElement {
  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 18 }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1.375rem",
            letterSpacing: "-0.015em",
            margin: 0,
          }}
        >
          {group.label}
        </h2>
        <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--ink3)" }}>
          {group.items.length} indicadores
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
          gap: 14,
        }}
      >
        {group.items.map((indicator) => (
          <CatalogCard key={indicator.indicator_code} indicator={indicator} />
        ))}
      </div>
    </section>
  );
}

export function IndicatorCatalog(): ReactElement {
  const { data, isLoading, isError, error, refetch } = useIndicators();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<IndicatorFamily | null>(null);

  const groups = useMemo(() => groupByFamily(data ?? [], query, family), [data, query, family]);
  const total = data?.length ?? 0;
  const shown = groups.reduce((sum, group) => sum + group.items.length, 0);

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
      <div
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
        }}
      >
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-[130px] rounded-[9px]" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 32,
          flexWrap: "wrap",
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder="Buscar indicador…"
          aria-label="Buscar indicador"
          style={{
            flex: 1,
            minWidth: 240,
            fontFamily: MONO,
            fontSize: "0.8125rem",
            padding: "11px 16px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--raise)",
            color: "var(--ink)",
          }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              setFamily(null);
            }}
            style={filterStyle(family === null)}
          >
            {ALL_FILTER}
          </button>
          {INDICATOR_FAMILY_ORDER.map((familyKey) => (
            <button
              key={familyKey}
              type="button"
              onClick={() => {
                setFamily(familyKey);
              }}
              style={filterStyle(family === familyKey)}
            >
              {INDICATOR_FAMILY_LABELS[familyKey]}
            </button>
          ))}
        </div>
      </div>

      <p style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--ink3)", margin: "0 0 26px" }}>
        {query.trim().length > 0 || family ? `${shown} de ${total} indicadores` : `${total} indicadores`}
      </p>

      {groups.length === 0 && (
        <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink2)" }}>
          No hay indicadores que coincidan con la búsqueda.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
        {groups.map((group) => (
          <FamilyGroupSection key={group.key} group={group} />
        ))}
      </div>
    </div>
  );
}
