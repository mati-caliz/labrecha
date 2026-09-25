"use client";

import { GapHistory } from "@/components/indicator/GapHistory";
import { TermBreakdown } from "@/components/indicator/TermBreakdown";
import { VariationSinceEvent } from "@/components/indicator/VariationSinceEvent";
import { ChartCard } from "@/components/indicator/detail/ChartCard";
import { DataTableCard } from "@/components/indicator/detail/DataTableCard";
import {
  type IndicatorDetailModel,
  buildIndicatorDetailModel,
} from "@/components/indicator/detail/detailModel";
import { GapPanel, RelatedGapLinks, SourcePanel } from "@/components/indicator/detail/GapPanel";
import { IndicatorHero } from "@/components/indicator/detail/IndicatorHero";
import { RangeSelector } from "@/components/indicator/detail/RangeSelector";
import { VariationRow } from "@/components/indicator/detail/VariationRow";
import { MONO } from "@/components/indicator/detail/styles";
import { Skeleton } from "@/components/ui/skeleton";
import { useIndicatorSeriesMulti, useIndicatorSources, usePoliticalEvents } from "@/hooks/useLabrecha";
import {
  DEFAULT_RANGE,
  INDICATOR_FAMILY_LABELS,
  type IndicatorDisplay,
  RANGE_MONTHS,
  getIndicatorDisplay,
  getIndicatorMeta,
} from "@/lib/indicators";
import type { IndicatorSourceSummary } from "@/lib/labrechaApi";
import { latestSourceDate, orderIndicatorSources, rangeDateFrom } from "@/lib/series";
import Link from "next/link";
import { useState, type ReactElement } from "react";

const FALLBACK_RANGE_MONTHS = 12;

interface IndicatorDetailProps {
  code: string;
}

function ComparisonGrid({
  indicator,
  ordered,
  model,
}: Readonly<{
  indicator: IndicatorDisplay;
  ordered: IndicatorSourceSummary[];
  model: IndicatorDetailModel;
}>): ReactElement {
  const { gapPct, variations } = model;
  return (
    <div className="lb-indicator-grid" style={{ marginBottom: 24 }}>
      {model.isComparator && gapPct !== undefined ? (
        <GapPanel indicator={indicator} gapPct={gapPct} sources={ordered} />
      ) : (
        <SourcePanel primary={model.primary} />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <VariationRow label="Variación reciente" reference="vs. dato anterior" variation={variations.step} />
        <VariationRow label="Variación mensual" reference="vs. hace 1 mes" variation={variations.month} />
        <VariationRow
          label="Variación interanual"
          reference="vs. hace 12 meses"
          variation={variations.year}
        />
      </div>
    </div>
  );
}

export function IndicatorDetail({ code }: Readonly<IndicatorDetailProps>): ReactElement {
  const [range, setRange] = useState(DEFAULT_RANGE);
  const indicator = getIndicatorDisplay(code);
  const meta = getIndicatorMeta(code);
  const familyLabel = meta ? INDICATOR_FAMILY_LABELS[meta.family] : "Indicadores";
  const { data: sourcesData, isLoading: loadingSources } = useIndicatorSources(code);

  const ordered = orderIndicatorSources(sourcesData ?? [], indicator.preferredSource);
  const sourceCodes = ordered.map((source) => source.source);
  const latestDate = latestSourceDate(ordered);
  const dateFrom = rangeDateFrom(latestDate, RANGE_MONTHS[range] ?? FALLBACK_RANGE_MONTHS);

  const seriesQueries = useIndicatorSeriesMulti(code, sourceCodes, {
    order: "asc",
    date_from: dateFrom,
  });
  const { data: eventsData } = usePoliticalEvents({ date_from: dateFrom, date_to: latestDate });

  if (loadingSources) {
    return <Skeleton className="h-64 w-full rounded-[10px]" />;
  }

  const model = buildIndicatorDetailModel({
    code,
    indicator,
    ordered,
    seriesQueries,
    events: eventsData ?? [],
  });
  const primarySource = model.primary?.source;

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
        primaryValue={model.primaryValue}
        stepVariation={model.variations.step}
        sources={ordered}
        stale={model.stale}
      />

      <RangeSelector range={range} onRangeChange={setRange} />

      <ChartCard indicator={indicator} model={model} />

      <ComparisonGrid indicator={indicator} ordered={ordered} model={model} />

      <RelatedGapLinks code={code} />

      <DataTableCard
        code={code}
        indicator={indicator}
        ordered={ordered}
        latestDate={latestDate}
        model={model}
      />

      <TermBreakdown code={code} source={primarySource} />

      <GapHistory code={code} />

      <VariationSinceEvent code={code} source={primarySource} />
    </div>
  );
}
