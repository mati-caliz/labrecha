import type { ReactElement } from "react";
import { seriesColor } from "./chartGeometry";
import type { ChartSeries } from "./chartTypes";

interface ChartLegendProps {
  series: ChartSeries[];
  showEvents: boolean;
  showGap: boolean;
}

export function ChartLegend({ series, showEvents, showGap }: Readonly<ChartLegendProps>): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "4px 16px",
        marginTop: 8,
        fontSize: "0.75rem",
        color: "var(--ink2)",
      }}
    >
      {series.map((entry, seriesIndex) => (
        <span key={`legend-${entry.name}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 14,
              height: 0,
              borderTop: `2px ${entry.dashed === true ? "dashed" : "solid"} ${seriesColor(entry.color, seriesIndex)}`,
            }}
          />
          {entry.name}
        </span>
      ))}
      {showEvents && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: "var(--event)",
              transform: "rotate(45deg)",
            }}
          />
          Evento político
        </span>
      )}
      {showGap && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 12,
              height: 10,
              background: "var(--gap)",
              opacity: 0.25,
              borderRadius: 2,
            }}
          />
          Brecha entre mediciones
        </span>
      )}
    </div>
  );
}
