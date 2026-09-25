import type { ReactElement } from "react";
import { CHART_PADDING, CHART_WIDTH, linePath, seriesColor, type ChartFrame } from "./chartGeometry";
import type { ChartEvent, ChartSeries, ValueFormatter } from "./chartTypes";

const Y_TICK_LABEL_GAP = 8;
const Y_TICK_LABEL_BASELINE_SHIFT = 3;
const X_LABEL_BOTTOM_OFFSET = 8;
const EVENT_LINE_OVERSHOOT = 6;
const EVENT_MARKER_SIZE = 8;
const EVENT_MARKER_TOP_OFFSET = 12;
const EVENT_MARKER_CENTER_OFFSET = 8;

export function YAxisGrid({
  frame,
  format,
}: Readonly<{ frame: ChartFrame; format: ValueFormatter }>): ReactElement {
  return (
    <>
      {frame.ticks.map((tick) => (
        <g key={`grid-${tick}`}>
          <line
            x1={CHART_PADDING.left}
            x2={CHART_WIDTH - CHART_PADDING.right}
            y1={frame.yOf(tick)}
            y2={frame.yOf(tick)}
            stroke="var(--line2)"
            strokeWidth="1"
          />
          <text
            x={CHART_PADDING.left - Y_TICK_LABEL_GAP}
            y={frame.yOf(tick) + Y_TICK_LABEL_BASELINE_SHIFT}
            textAnchor="end"
            fontSize="10"
            fill="var(--ink3)"
            fontFamily="var(--font-jb-mono)"
          >
            {format(tick)}
          </text>
        </g>
      ))}
    </>
  );
}

export function XAxisLabels({
  frame,
  labels,
}: Readonly<{ frame: ChartFrame; labels: string[] }>): ReactElement {
  return (
    <>
      {labels.map((label, index) =>
        label.length > 0 ? (
          <text
            key={`xl-${label}`}
            x={frame.xOf(index)}
            y={frame.height - X_LABEL_BOTTOM_OFFSET}
            textAnchor="middle"
            fontSize="10"
            fill="var(--ink3)"
            fontFamily="var(--font-jb-mono)"
          >
            {label}
          </text>
        ) : null,
      )}
    </>
  );
}

export function EventMarkers({
  frame,
  events,
}: Readonly<{ frame: ChartFrame; events: ChartEvent[] }>): ReactElement {
  return (
    <>
      {events.map((event) => (
        <g key={`ev-${event.index}-${event.label}`}>
          <line
            x1={frame.xOf(event.index)}
            x2={frame.xOf(event.index)}
            y1={CHART_PADDING.top - EVENT_LINE_OVERSHOOT}
            y2={frame.height - CHART_PADDING.bottom}
            stroke="var(--event)"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.7"
          />
          <rect
            x={frame.xOf(event.index) - EVENT_MARKER_SIZE / 2}
            y={CHART_PADDING.top - EVENT_MARKER_TOP_OFFSET}
            width={EVENT_MARKER_SIZE}
            height={EVENT_MARKER_SIZE}
            rx="1.5"
            fill="var(--event)"
            transform={`rotate(45 ${frame.xOf(event.index)} ${CHART_PADDING.top - EVENT_MARKER_CENTER_OFFSET})`}
          />
        </g>
      ))}
    </>
  );
}

export function SeriesLines({
  frame,
  series,
}: Readonly<{ frame: ChartFrame; series: ChartSeries[] }>): ReactElement {
  return (
    <>
      {series.map((entry, seriesIndex) => (
        <path
          key={`line-${entry.name}`}
          d={linePath(entry.data, frame.project)}
          fill="none"
          stroke={seriesColor(entry.color, seriesIndex)}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={entry.dashed === true ? "5 4" : undefined}
        />
      ))}
    </>
  );
}

interface HoverMarkerProps {
  frame: ChartFrame;
  series: ChartSeries[];
  hover: number;
}

export function HoverMarker({ frame, series, hover }: Readonly<HoverMarkerProps>): ReactElement {
  return (
    <g>
      <line
        x1={frame.xOf(hover)}
        x2={frame.xOf(hover)}
        y1={CHART_PADDING.top}
        y2={frame.height - CHART_PADDING.bottom}
        stroke="var(--ink3)"
        strokeWidth="1"
      />
      {series.map((entry, seriesIndex) => {
        const value = entry.data[hover]?.v;
        return value === null || value === undefined ? null : (
          <circle
            key={`hover-${entry.name}`}
            cx={frame.xOf(hover)}
            cy={frame.yOf(value)}
            r="3.5"
            fill={seriesColor(entry.color, seriesIndex)}
            stroke="var(--raise)"
            strokeWidth="1.5"
          />
        );
      })}
    </g>
  );
}
