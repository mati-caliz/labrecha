import type { ReactElement } from "react";
import { seriesColor } from "./chartGeometry";
import type { ChartEvent, ChartSeries, ValueFormatter } from "./chartTypes";

const NO_DATA_LABEL = "sin dato";
const TOOLTIP_EDGE_OFFSET = 12;

function TooltipRow({
  entry,
  seriesIndex,
  value,
  format,
}: Readonly<{
  entry: ChartSeries;
  seriesIndex: number;
  value: number | null;
  format: ValueFormatter;
}>): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "center",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          color: "var(--ink2)",
        }}
      >
        <span style={{ width: 8, height: 2, background: seriesColor(entry.color, seriesIndex) }} />
        {entry.name}
      </span>
      <b className="num" style={value === null ? { color: "var(--ink3)" } : undefined}>
        {value === null ? NO_DATA_LABEL : format(value)}
      </b>
    </div>
  );
}

function TooltipEvent({ event }: Readonly<{ event: ChartEvent | undefined }>): ReactElement | null {
  if (event === undefined) {
    return null;
  }
  return (
    <div
      style={{
        marginTop: 5,
        paddingTop: 5,
        borderTop: "1px solid var(--line)",
        color: "var(--event)",
        fontWeight: 600,
      }}
    >
      ◆ {event.label}
    </div>
  );
}

interface ChartTooltipProps {
  series: ChartSeries[];
  events: ChartEvent[];
  hover: number;
  pointCount: number;
  format: ValueFormatter;
}

export function ChartTooltip({
  series,
  events,
  hover,
  pointCount,
  format,
}: Readonly<ChartTooltipProps>): ReactElement {
  const anchoredLeft = hover > pointCount / 2;
  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: anchoredLeft ? TOOLTIP_EDGE_OFFSET : "auto",
        right: anchoredLeft ? "auto" : TOOLTIP_EDGE_OFFSET,
        background: "var(--raise)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-raised)",
        padding: "8px 10px",
        fontSize: "0.6875rem",
        pointerEvents: "none",
        minWidth: 150,
      }}
    >
      <div style={{ color: "var(--ink3)", marginBottom: 4, fontFamily: "var(--font-jb-mono)" }}>
        {series[0]?.data[hover]?.t}
      </div>
      {series.map((entry, seriesIndex) => {
        const value = entry.data[hover]?.v;
        return value === undefined ? null : (
          <TooltipRow
            key={`tip-${entry.name}`}
            entry={entry}
            seriesIndex={seriesIndex}
            value={value}
            format={format}
          />
        );
      })}
      <TooltipEvent event={events.find((event) => event.index === hover)} />
    </div>
  );
}
