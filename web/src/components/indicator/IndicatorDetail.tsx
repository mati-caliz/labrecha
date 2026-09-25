"use client";

import { AnnotatedSeriesChart, type ChartSeries } from "@/components/core";
import { GapHistory } from "@/components/indicator/GapHistory";
import { SeriesExport } from "@/components/indicator/SeriesExport";
import { TermBreakdown } from "@/components/indicator/TermBreakdown";
import { VariationSinceEvent } from "@/components/indicator/VariationSinceEvent";
import { GapPanel, RelatedGapLinks, SourcePanel } from "@/components/indicator/detail/GapPanel";
import { IndicatorHero } from "@/components/indicator/detail/IndicatorHero";
import { RangeSelector } from "@/components/indicator/detail/RangeSelector";
import { SeriesTable, buildTableRows } from "@/components/indicator/detail/SeriesTable";
import { VariationRow } from "@/components/indicator/detail/VariationRow";
import { CARD_STYLE, MONO, sourceColor } from "@/components/indicator/detail/styles";
import {
  gapPercent,
  variationVsMonthsAgo,
  variationVsPreviousPoint,
} from "@/components/indicator/detail/variation";
import { Skeleton } from "@/components/ui/skeleton";
import { useIndicatorSeriesMulti, useIndicatorSources, usePoliticalEvents } from "@/hooks/useLabrecha";
import { freshnessForCode } from "@/lib/freshness";
import {
  DEFAULT_RANGE,
  INDICATOR_FAMILY_LABELS,
  RANGE_MONTHS,
  formatDateAR,
  formatMonthAR,
  getIndicatorDisplay,
  getIndicatorMeta,
  sourceLabel,
} from "@/lib/indicators";
import type { IndicatorPoint } from "@/lib/labrechaApi";
import {
  alignSources,
  eventsToChartEvents,
  latestSourceDate,
  orderIndicatorSources,
  parsePoints,
  rangeDateFrom,
  yearLabels,
} from "@/lib/series";
import Link from "next/link";
import { useState } from "react";

interface IndicatorDetailProps {
  code: string;
}

function baseMonthOf(points: IndicatorPoint[]): string | undefined {
  for (const point of points) {
    const baseMonth = point.meta.base_month;
    if (typeof baseMonth === "string") {
      return baseMonth;
    }
  }
  return undefined;
}

export function IndicatorDetail({ code }: IndicatorDetailProps) {
  const [range, setRange] = useState(DEFAULT_RANGE);
  const indicator = getIndicatorDisplay(code);
  const meta = getIndicatorMeta(code);
  const familyLabel = meta ? INDICATOR_FAMILY_LABELS[meta.family] : "Indicadores";
  const { data: sourcesData, isLoading: loadingSources } = useIndicatorSources(code);

  const sources = sourcesData ?? [];
  const ordered = orderIndicatorSources(sources, indicator.preferredSource);
  const sourceCodes = ordered.map((source) => source.source);
  const latestDate = latestSourceDate(ordered);
  const dateFrom = rangeDateFrom(latestDate, RANGE_MONTHS[range] ?? 12);

  const seriesQueries = useIndicatorSeriesMulti(code, sourceCodes, {
    order: "asc",
    date_from: dateFrom,
  });
  const { data: eventsData } = usePoliticalEvents({ date_from: dateFrom, date_to: latestDate });

  if (loadingSources) {
    return <Skeleton className="h-64 w-full rounded-[10px]" />;
  }

  const parsedSources = ordered
    .map((source, index) => ({
      source: source.source,
      points: parsePoints(seriesQueries[index]?.data?.points ?? []),
    }))
    .filter((source) => source.points.length > 0);

  const aligned = alignSources(parsedSources);
  const chartSeries: ChartSeries[] = aligned.lines.map((line, index) => ({
    name: sourceLabel(line.source),
    color: sourceColor(index),
    data: line.data.map((value, position) => ({
      t: formatDateAR(aligned.axis[position] ?? ""),
      v: value,
    })),
  }));
  const chartEvents = eventsToChartEvents(aligned.axis, eventsData ?? []);
  const xLabels = yearLabels(aligned.axis);
  const hasSeries = aligned.axis.length >= 2;
  const isComparator = ordered.length >= 2;

  const primary = ordered[0];
  const primaryPoints = parsedSources.find((source) => source.source === primary?.source)?.points ?? [];
  const primaryValue = primary ? Number.parseFloat(primary.latest_value) : undefined;
  const stepVariation = variationVsPreviousPoint(indicator, primaryPoints);
  const monthVariation = variationVsMonthsAgo(indicator, primaryPoints, 1);
  const yearVariation = variationVsMonthsAgo(indicator, primaryPoints, 12);

  const secondValue = isComparator && ordered[1] ? Number.parseFloat(ordered[1].latest_value) : undefined;
  const gapPct = gapPercent(primaryValue, secondValue);
  const tableRows = buildTableRows(aligned);
  const stale = primary ? freshnessForCode(code, primary.last_date).stale : false;
  const baseMonth = baseMonthOf(seriesQueries.flatMap((query) => query.data?.points ?? []));

  return (
    <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "28px 24px 72px" }}>
      <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--ink3)", marginBottom: 20 }}>
        <Link href="/indicadores" style={{ color: "var(--ink3)", textDecoration: "none" }}>
          Indicadores
        </Link>{" "}
        / {familyLabel} / <span style={{ color: "var(--ink2)" }}>{indicator.label}</span>
      </div>

      <IndicatorHero
        code={code}
        familyLabel={familyLabel}
        indicator={indicator}
        primaryValue={primaryValue}
        stepVariation={stepVariation}
        sources={ordered}
        stale={stale}
      />

      <RangeSelector range={range} onRangeChange={setRange} />

      <div style={{ ...CARD_STYLE, padding: "26px 28px 22px", marginBottom: 24 }}>
        {hasSeries ? (
          <AnnotatedSeriesChart
            series={chartSeries}
            events={chartEvents}
            gapFill={isComparator}
            yFormat={(value) => indicator.format(value)}
            xLabels={xLabels}
            height={320}
          />
        ) : (
          <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink2)", margin: 0 }}>
            Todavía no hay suficiente serie histórica para graficar este indicador en el rango seleccionado.
          </p>
        )}
        {baseMonth && (
          <p
            style={{
              fontFamily: MONO,
              fontSize: "0.68rem",
              color: "var(--ink3)",
              margin: "12px 0 0",
            }}
          >
            Serie a precios constantes, expresada en pesos de {formatMonthAR(baseMonth)} (base fija,
            deflactada por el IPC nivel general del INDEC).
          </p>
        )}
      </div>

      <div className="lb-indicator-grid" style={{ marginBottom: 24 }}>
        {isComparator && gapPct !== undefined ? (
          <GapPanel indicator={indicator} gapPct={gapPct} sources={ordered} />
        ) : (
          <SourcePanel primary={primary} />
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <VariationRow label="Variación reciente" reference="vs. dato anterior" variation={stepVariation} />
          <VariationRow label="Variación mensual" reference="vs. hace 1 mes" variation={monthVariation} />
          <VariationRow
            label="Variación interanual"
            reference="vs. hace 12 meses"
            variation={yearVariation}
          />
        </div>
      </div>

      <RelatedGapLinks code={code} />

      <div style={{ ...CARD_STYLE, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "18px 24px",
            borderBottom: "1px solid var(--line)",
            flexWrap: "wrap",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "1.1875rem",
              margin: 0,
            }}
          >
            Tabla de datos
          </h2>
          <SeriesExport
            code={code}
            indicator={indicator}
            sources={parsedSources}
            latest={
              primary && primaryValue !== undefined
                ? { source: primary.source, value: primaryValue, date: primary.last_date }
                : undefined
            }
          />
        </div>
        <SeriesTable indicator={indicator} aligned={aligned} rows={tableRows} isComparator={isComparator} />
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--line)",
            fontFamily: MONO,
            fontSize: "0.68rem",
            color: "var(--ink3)",
          }}
        >
          Fuentes: {ordered.map((source) => sourceLabel(source.source)).join(" · ")}
          {indicator.unit ? ` · en ${indicator.unit}` : ""}
          {latestDate ? ` · última actualización ${formatDateAR(latestDate)}` : ""}
        </div>
      </div>

      <TermBreakdown code={code} source={primary?.source} />

      <GapHistory code={code} />

      <VariationSinceEvent code={code} source={primary?.source} />
    </div>
  );
}
