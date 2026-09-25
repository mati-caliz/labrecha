"use client";

import { AnnotatedSeriesChart, type ChartEvent } from "@/components/core";
import { ActionLink, MiniSparkline, SectionHead, SourceChip } from "@/components/home/homeShared";
import { Skeleton } from "@/components/ui/skeleton";
import { useIndicatorSeries, usePoliticalEvents } from "@/hooks/useLabrecha";
import {
  INDICATOR_BY_CODE,
  formatDateAR,
  formatNumberAR,
  getIndicatorDisplay,
  sourceLabel,
  type GoodWhen,
  type IndicatorDisplay,
} from "@/lib/indicators";
import type { IndicatorPoint, PoliticalEvent } from "@/lib/labrechaApi";
import { HERO_CODE, HERO_POINTS, HERO_SOURCE, TILE_CODES } from "@/lib/queryParams";
import Link from "next/link";
import type { CSSProperties, ReactElement } from "react";
import { hasText } from "@/lib/utils";

const PERCENT_FACTOR = 100;
const HERO_X_LABEL_COUNT = 4;
const FLAT_VARIATION_COLOR = "var(--ink2)";

interface Variation {
  text: string;
  color: string;
  background: string;
}

type VariationRule = Pick<IndicatorDisplay, "variation" | "variationSuffix" | "goodWhen">;

interface VariationDelta {
  delta: number;
  label: string;
}

function computeDelta(latest: number, previous: number, rule: VariationRule): VariationDelta | undefined {
  if (rule.variation === "pct") {
    if (previous === 0) {
      return undefined;
    }
    const delta = ((latest - previous) / previous) * PERCENT_FACTOR;
    return { delta, label: `${formatNumberAR(Math.abs(delta), 1)}%` };
  }
  const delta = latest - previous;
  return { delta, label: `${formatNumberAR(Math.abs(delta), 1)}${rule.variationSuffix ?? " pp"}` };
}

function isGoodChange(rising: boolean, goodWhen: GoodWhen): boolean {
  if (goodWhen === "neutral") {
    return true;
  }
  return goodWhen === "up" ? rising : !rising;
}

function computeVariation(
  latest: number,
  previous: number | undefined,
  rule: VariationRule,
): Variation | undefined {
  if (previous === undefined || rule.variation === "none") {
    return undefined;
  }
  const change = computeDelta(latest, previous, rule);
  if (change === undefined) {
    return undefined;
  }
  if (change.delta === 0) {
    return { text: `= ${change.label}`, color: FLAT_VARIATION_COLOR, background: "transparent" };
  }
  const rising = change.delta > 0;
  const good = isGoodChange(rising, rule.goodWhen);
  return {
    text: `${rising ? "▲" : "▼"} ${change.label}`,
    color: good ? "var(--pos)" : "var(--neg)",
    background: good ? "var(--pos-bg)" : "var(--neg-bg)",
  };
}

const TILE_STYLE: CSSProperties = {
  background: "var(--raise)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: "16px 16px 14px",
};

function StatTile({ code }: Readonly<{ code: string }>): ReactElement | null {
  const indicator = INDICATOR_BY_CODE[code] ?? getIndicatorDisplay(code);
  const { data, isLoading } = useIndicatorSeries(indicator.code, {
    source: indicator.preferredSource,
    limit: indicator.sparkPoints,
    order: "desc",
  });

  if (isLoading) {
    return <Skeleton className="h-[118px] rounded-[8px]" />;
  }

  const points = data?.points ?? [];
  const latest = points[0];
  if (latest === undefined) {
    return null;
  }
  return <StatTileBody indicator={indicator} latest={latest} points={points} />;
}

function StatTileBody({
  indicator,
  latest,
  points,
}: Readonly<{
  indicator: IndicatorDisplay;
  latest: IndicatorPoint;
  points: IndicatorPoint[];
}>): ReactElement {
  const latestValue = Number.parseFloat(latest.value);
  const previousPoint = points[1];
  const previous = previousPoint === undefined ? undefined : Number.parseFloat(previousPoint.value);
  const ascending = [...points].reverse().map((point) => Number.parseFloat(point.value));
  const variation = computeVariation(latestValue, previous, indicator);

  return (
    <Link
      href={indicator.href}
      style={{ ...TILE_STYLE, display: "block", textDecoration: "none", color: "var(--ink)" }}
    >
      <div
        style={{
          fontFamily: "var(--font-jb-mono)",
          fontSize: "0.66rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ink3)",
          marginBottom: 10,
        }}
      >
        {indicator.label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jb-mono)",
          fontWeight: 700,
          fontSize: "1.5rem",
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {indicator.format(latestValue)}
        {hasText(indicator.unit) ? (
          <span style={{ fontSize: "0.8rem", color: "var(--ink3)", marginLeft: 4 }}>{indicator.unit}</span>
        ) : null}
      </div>
      <MiniSparkline data={ascending} style={{ margin: "8px 0 6px" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          style={{
            fontFamily: "var(--font-jb-mono)",
            fontSize: "0.68rem",
            color: variation?.color ?? "var(--ink3)",
          }}
        >
          {variation?.text ?? ""}
        </span>
        <span style={{ fontFamily: "var(--font-jb-mono)", fontSize: "0.62rem", color: "var(--ink3)" }}>
          {sourceLabel(latest.source)} · {formatDateAR(latest.date)}
        </span>
      </div>
    </Link>
  );
}

function lastIndexOnOrBefore(dates: string[], date: string): number {
  let matchIndex = -1;
  for (let index = 0; index < dates.length; index += 1) {
    if ((dates[index] ?? "") <= date) {
      matchIndex = index;
    }
  }
  return matchIndex;
}

function buildChartEvents(dates: string[], events: PoliticalEvent[]): ChartEvent[] {
  const firstDate = dates[0] ?? "";
  const lastDate = dates[dates.length - 1] ?? "";
  const chartEvents: ChartEvent[] = [];
  const seen = new Set<number>();
  for (const event of events) {
    if (event.date < firstDate || event.date > lastDate) {
      continue;
    }
    const matchIndex = lastIndexOnOrBefore(dates, event.date);
    if (matchIndex >= 0 && !seen.has(matchIndex)) {
      seen.add(matchIndex);
      chartEvents.push({ index: matchIndex, label: event.title });
    }
  }
  return chartEvents;
}

function buildHeroXLabels(dates: string[]): string[] {
  const step = Math.max(1, Math.floor(dates.length / HERO_X_LABEL_COUNT));
  return dates.map((date, index) =>
    index % step === 0 || index === dates.length - 1
      ? new Date(`${date}T00:00:00`).toLocaleDateString("es-AR", {
          month: "short",
          year: "2-digit",
        })
      : "",
  );
}

interface HeroHeaderProps {
  indicator: IndicatorDisplay;
  latest: IndicatorPoint;
  latestValue: number;
  variation: Variation | undefined;
}

function HeroHeader({ indicator, latest, latestValue, variation }: Readonly<HeroHeaderProps>): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 20,
        marginBottom: 20,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "var(--font-jb-mono)",
            fontSize: "0.7rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink3)",
            marginBottom: 10,
          }}
        >
          {indicator.label} · IPC nacional
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: "var(--font-jb-mono)",
              fontWeight: 700,
              fontSize: "clamp(2.75rem, 7vw, 3.75rem)",
              lineHeight: 0.82,
              letterSpacing: "-0.03em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {indicator.format(latestValue)}
            <span style={{ fontSize: "0.5em", color: "var(--ink3)" }}>%</span>
          </span>
          {variation ? (
            <span
              style={{
                fontFamily: "var(--font-jb-mono)",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: variation.color,
                background: variation.background,
                padding: "4px 9px",
                borderRadius: 5,
                marginBottom: 8,
              }}
            >
              {variation.text}
            </span>
          ) : null}
        </div>
      </div>
      <SourceChip source={sourceLabel(latest.source)} date={formatDateAR(latest.date)} />
    </div>
  );
}

function HeroIndicator(): ReactElement | null {
  const indicator = getIndicatorDisplay(HERO_CODE);
  const { data, isLoading } = useIndicatorSeries(HERO_CODE, {
    source: HERO_SOURCE,
    limit: HERO_POINTS,
    order: "desc",
  });
  const eventsQuery = usePoliticalEvents();

  if (isLoading) {
    return <Skeleton className="h-[420px] rounded-[8px]" />;
  }

  const ascending = [...(data?.points ?? [])].reverse();
  if (ascending.length < 2) {
    return null;
  }
  const values = ascending.map((point) => Number.parseFloat(point.value));
  const datesAsc = ascending.map((point) => point.date);
  const latest = ascending[ascending.length - 1];
  const latestValue = values[values.length - 1];
  const previousValue = values[values.length - 2];
  if (!latest || latestValue === undefined || previousValue === undefined) {
    return null;
  }
  const variation = computeVariation(latestValue, previousValue, indicator);

  const chartEvents = buildChartEvents(datesAsc, eventsQuery.data ?? []);

  const xLabels = buildHeroXLabels(datesAsc);

  return (
    <article style={{ ...TILE_STYLE, padding: "28px 30px 26px" }}>
      <HeroHeader indicator={indicator} latest={latest} latestValue={latestValue} variation={variation} />

      <AnnotatedSeriesChart
        series={[
          {
            name: "IPC mensual",
            color: "var(--chart)",
            data: values.map((value, index) => ({ t: formatDateAR(datesAsc[index] ?? ""), v: value })),
          },
        ]}
        events={chartEvents}
        xLabels={xLabels}
        gapFill={false}
        height={280}
        yFormat={(value) => `${formatNumberAR(value, 1)}%`}
      />

      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: "1px solid var(--line)",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <ActionLink href={indicator.href}>Ver serie completa →</ActionLink>
      </div>
    </article>
  );
}

export function CountryStatus(): ReactElement {
  return (
    <section className="lb-container" style={{ paddingTop: 64, paddingBottom: 24 }}>
      <SectionHead
        index="01"
        title="El estado del país"
        action={<ActionLink href="/indicadores">Ver todos los indicadores →</ActionLink>}
      />
      <div className="lb-status-grid">
        <HeroIndicator />
        <div className="lb-tiles">
          {TILE_CODES.map((code) => (
            <StatTile key={code} code={code} />
          ))}
        </div>
      </div>
    </section>
  );
}
