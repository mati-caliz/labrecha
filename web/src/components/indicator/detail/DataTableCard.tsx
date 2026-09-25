"use client";
import type { ReactElement } from "react";

import { SeriesExport } from "@/components/indicator/SeriesExport";
import type { IndicatorDetailModel } from "@/components/indicator/detail/detailModel";
import { SeriesTable } from "@/components/indicator/detail/SeriesTable";
import { CARD_STYLE, MONO } from "@/components/indicator/detail/styles";
import { type IndicatorDisplay, formatDateAR, sourceLabel } from "@/lib/indicators";
import type { IndicatorSourceSummary } from "@/lib/labrechaApi";
import { hasText } from "@/lib/utils";

export function DataTableCard({
  code,
  indicator,
  ordered,
  latestDate,
  model,
}: Readonly<{
  code: string;
  indicator: IndicatorDisplay;
  ordered: IndicatorSourceSummary[];
  latestDate: string;
  model: IndicatorDetailModel;
}>): ReactElement {
  return (
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
          sources={model.parsedSources}
          latest={model.latestExport}
        />
      </div>
      <SeriesTable
        indicator={indicator}
        aligned={model.aligned}
        rows={model.tableRows}
        isComparator={model.isComparator}
      />
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
        {hasText(indicator.unit) ? ` · en ${indicator.unit}` : ""}
        {latestDate ? ` · última actualización ${formatDateAR(latestDate)}` : ""}
      </div>
    </div>
  );
}
