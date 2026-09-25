"use client";

import { type CSSProperties, type MouseEvent, useState, type ReactElement } from "react";
import { hasText } from "@/lib/utils";
import { ChartLegend } from "./ChartLegend";
import { EventMarkers, HoverMarker, SeriesLines, XAxisLabels, YAxisGrid } from "./ChartLayers";
import { ChartTooltip } from "./ChartTooltip";
import {
  CHART_WIDTH,
  buildChartFrame,
  defaultValueFormat,
  gapAreaPath,
  type ChartFrame,
} from "./chartGeometry";
import type { ChartEvent, ChartSeries, ValueFormatter } from "./chartTypes";

export type { ChartEvent, ChartSeries, SeriesPoint } from "./chartTypes";

const DEFAULT_CHART_HEIGHT = 280;

interface AnnotatedSeriesChartProps {
  series: ChartSeries[];
  events?: ChartEvent[];
  height?: number;
  gapFill?: boolean;
  yFormat?: ValueFormatter;
  xLabels?: string[];
  style?: CSSProperties;
}

function resolveGapArea(series: ChartSeries[], gapFill: boolean, frame: ChartFrame): string | null {
  const firstSeries = series[0];
  const secondSeries = series[1];
  if (!gapFill || firstSeries === undefined || secondSeries === undefined) {
    return null;
  }
  return gapAreaPath(firstSeries.data, secondSeries.data, frame.project);
}

export function AnnotatedSeriesChart({
  series,
  events = [],
  height = DEFAULT_CHART_HEIGHT,
  gapFill = true,
  yFormat,
  xLabels = [],
  style,
}: Readonly<AnnotatedSeriesChartProps>): ReactElement {
  const [hover, setHover] = useState<number | null>(null);
  const frame = buildChartFrame(series, height);
  const format = yFormat ?? defaultValueFormat;
  const gapArea = resolveGapArea(series, gapFill, frame);

  const onMove = (event: MouseEvent<SVGSVGElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    const chartX = ((event.clientX - rect.left) / rect.width) * CHART_WIDTH;
    const index = frame.indexAt(chartX);
    setHover(index >= 0 && index < frame.pointCount ? index : null);
  };

  return (
    <div style={{ position: "relative", ...style }}>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${height}`}
        style={{ display: "block", width: "100%", height: "auto" }}
        role="img"
        aria-label={`Serie temporal: ${series.map((entry) => entry.name).join(", ")}`}
        onMouseMove={onMove}
        onMouseLeave={() => {
          setHover(null);
        }}
      >
        <YAxisGrid frame={frame} format={format} />
        <XAxisLabels frame={frame} labels={xLabels} />
        {hasText(gapArea) && <path d={gapArea} fill="var(--gap)" opacity="0.12" />}
        <EventMarkers frame={frame} events={events} />
        <SeriesLines frame={frame} series={series} />
        {hover !== null && <HoverMarker frame={frame} series={series} hover={hover} />}
      </svg>
      {hover !== null && (
        <ChartTooltip
          series={series}
          events={events}
          hover={hover}
          pointCount={frame.pointCount}
          format={format}
        />
      )}
      <ChartLegend series={series} showEvents={events.length > 0} showGap={hasText(gapArea)} />
    </div>
  );
}
