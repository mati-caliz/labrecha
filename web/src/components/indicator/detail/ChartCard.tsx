"use client";
import type { ReactElement } from "react";

import { AnnotatedSeriesChart } from "@/components/core";
import type { IndicatorDetailModel } from "@/components/indicator/detail/detailModel";
import { CARD_STYLE, MONO } from "@/components/indicator/detail/styles";
import { type IndicatorDisplay, formatMonthAR } from "@/lib/indicators";
import { hasText } from "@/lib/utils";

const CHART_HEIGHT = 320;

export function ChartCard({
  indicator,
  model,
}: Readonly<{ indicator: IndicatorDisplay; model: IndicatorDetailModel }>): ReactElement {
  const { baseMonth } = model;
  return (
    <div style={{ ...CARD_STYLE, padding: "26px 28px 22px", marginBottom: 24 }}>
      {model.hasSeries ? (
        <AnnotatedSeriesChart
          series={model.chartSeries}
          events={model.chartEvents}
          gapFill={model.isComparator}
          yFormat={(value) => indicator.format(value)}
          xLabels={model.xLabels}
          height={CHART_HEIGHT}
        />
      ) : (
        <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink2)", margin: 0 }}>
          Todavía no hay suficiente serie histórica para graficar este indicador en el rango seleccionado.
        </p>
      )}
      {hasText(baseMonth) && (
        <p
          style={{
            fontFamily: MONO,
            fontSize: "0.68rem",
            color: "var(--ink3)",
            margin: "12px 0 0",
          }}
        >
          Serie a precios constantes, expresada en pesos de {formatMonthAR(baseMonth)} (base fija, deflactada
          por el IPC nivel general del INDEC).
        </p>
      )}
    </div>
  );
}
