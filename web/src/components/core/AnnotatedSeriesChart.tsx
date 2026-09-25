"use client";

import { type CSSProperties, type MouseEvent, useState } from "react";

export interface SeriesPoint {
  t?: string;
  v: number | null;
}

export interface ChartSeries {
  name: string;
  color?: string;
  dashed?: boolean;
  data: SeriesPoint[];
}

export interface ChartEvent {
  index: number;
  label: string;
}

interface AnnotatedSeriesChartProps {
  series: ChartSeries[];
  events?: ChartEvent[];
  height?: number;
  gapFill?: boolean;
  yFormat?: (value: number) => string;
  xLabels?: string[];
  style?: CSSProperties;
}

const NO_DATA_LABEL = "sin dato";

function scale(value: number, d0: number, d1: number, r0: number, r1: number) {
  return r0 + ((value - d0) / (d1 - d0 || 1)) * (r1 - r0);
}

type Projection = (index: number, value: number) => string;

function linePath(data: SeriesPoint[], project: Projection): string {
  const commands: string[] = [];
  let penDown = false;
  for (const [index, point] of data.entries()) {
    if (point.v === null) {
      penDown = false;
      continue;
    }
    commands.push(`${penDown ? "L" : "M"}${project(index, point.v)}`);
    penDown = true;
  }
  return commands.join(" ");
}

function measuredTogether(first: SeriesPoint[], second: SeriesPoint[]): number[][] {
  const segments: number[][] = [];
  let segment: number[] = [];
  const length = Math.min(first.length, second.length);
  for (let index = 0; index < length; index += 1) {
    const value = first[index]?.v;
    const other = second[index]?.v;
    if (value === null || value === undefined || other === null || other === undefined) {
      if (segment.length >= 2) {
        segments.push(segment);
      }
      segment = [];
      continue;
    }
    segment.push(index);
  }
  if (segment.length >= 2) {
    segments.push(segment);
  }
  return segments;
}

function gapAreaPath(first: SeriesPoint[], second: SeriesPoint[], project: Projection): string | null {
  const subpaths = measuredTogether(first, second).map((segment) => {
    const forward = segment.map((index) => project(index, first[index]?.v ?? 0));
    const back = [...segment].reverse().map((index) => project(index, second[index]?.v ?? 0));
    return `M${forward.join(" L")} L${back.join(" L")} Z`;
  });
  return subpaths.length > 0 ? subpaths.join(" ") : null;
}

export function AnnotatedSeriesChart({
  series,
  events = [],
  height = 280,
  gapFill = true,
  yFormat,
  xLabels = [],
  style,
}: AnnotatedSeriesChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 800;
  const H = height;
  const padL = 56;
  const padR = 16;
  const padT = 26;
  const padB = 26;
  const all = series.flatMap((s) =>
    s.data.map((p) => p.v).filter((value): value is number => value !== null),
  );
  const min = all.length > 0 ? Math.min(...all) : 0;
  const max = all.length > 0 ? Math.max(...all) : 1;
  const span = max - min || 1;
  const y0 = min - span * 0.08;
  const y1 = max + span * 0.1;
  const n = Math.max(...series.map((s) => s.data.length));
  const X = (i: number) => scale(i, 0, n - 1, padL, W - padR);
  const Y = (v: number) => scale(v, y0, y1, H - padB, padT);
  const fmt = yFormat || ((v: number) => v.toLocaleString("es-AR", { maximumFractionDigits: 1 }));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => y0 + t * (y1 - y0));
  const project: Projection = (index, value) => `${X(index).toFixed(1)},${Y(value).toFixed(1)}`;
  const firstSeries = series[0];
  const secondSeries = series[1];
  const gapArea =
    gapFill && firstSeries && secondSeries ? gapAreaPath(firstSeries.data, secondSeries.data, project) : null;

  const onMove = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const i = Math.round(scale(px, padL, W - padR, 0, n - 1));
    setHover(i >= 0 && i < n ? i : null);
  };

  return (
    <div style={{ position: "relative", ...style }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: "auto" }}
        role="img"
        aria-label={`Serie temporal: ${series.map((s) => s.name).join(", ")}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={`grid-${t}`}>
            <line x1={padL} x2={W - padR} y1={Y(t)} y2={Y(t)} stroke="var(--line2)" strokeWidth="1" />
            <text
              x={padL - 8}
              y={Y(t) + 3}
              textAnchor="end"
              fontSize="10"
              fill="var(--ink3)"
              fontFamily="var(--font-jb-mono)"
            >
              {fmt(t)}
            </text>
          </g>
        ))}
        {xLabels.map((label, i) =>
          label ? (
            <text
              key={`xl-${label}`}
              x={X(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="10"
              fill="var(--ink3)"
              fontFamily="var(--font-jb-mono)"
            >
              {label}
            </text>
          ) : null,
        )}
        {gapArea && <path d={gapArea} fill="var(--gap)" opacity="0.12" />}
        {events.map((event) => (
          <g key={`ev-${event.index}-${event.label}`}>
            <line
              x1={X(event.index)}
              x2={X(event.index)}
              y1={padT - 6}
              y2={H - padB}
              stroke="var(--event)"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.7"
            />
            <rect
              x={X(event.index) - 4}
              y={padT - 12}
              width="8"
              height="8"
              rx="1.5"
              fill="var(--event)"
              transform={`rotate(45 ${X(event.index)} ${padT - 8})`}
            />
          </g>
        ))}
        {series.map((s, si) => (
          <path
            key={`line-${s.name}`}
            d={linePath(s.data, project)}
            fill="none"
            stroke={s.color || `var(--serie-${si + 1})`}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={s.dashed ? "5 4" : undefined}
          />
        ))}
        {hover !== null && (
          <g>
            <line x1={X(hover)} x2={X(hover)} y1={padT} y2={H - padB} stroke="var(--ink3)" strokeWidth="1" />
            {series.map((s, si) => {
              const value = s.data[hover]?.v;
              return value === null || value === undefined ? null : (
                <circle
                  key={`hover-${s.name}`}
                  cx={X(hover)}
                  cy={Y(value)}
                  r="3.5"
                  fill={s.color || `var(--serie-${si + 1})`}
                  stroke="var(--raise)"
                  strokeWidth="1.5"
                />
              );
            })}
          </g>
        )}
      </svg>
      {hover !== null && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: hover > n / 2 ? 12 : "auto",
            right: hover > n / 2 ? "auto" : 12,
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
          {series.map((s, si) => {
            const value = s.data[hover]?.v;
            return value === undefined ? null : (
              <div
                key={`tip-${s.name}`}
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
                  <span style={{ width: 8, height: 2, background: s.color || `var(--serie-${si + 1})` }} />
                  {s.name}
                </span>
                <b className="num" style={value === null ? { color: "var(--ink3)" } : undefined}>
                  {value === null ? NO_DATA_LABEL : fmt(value)}
                </b>
              </div>
            );
          })}
          {(() => {
            const event = events.find((e) => e.index === hover);
            return event ? (
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
            ) : null;
          })()}
        </div>
      )}
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
        {series.map((s, si) => (
          <span key={`legend-${s.name}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 14,
                height: 0,
                borderTop: `2px ${s.dashed ? "dashed" : "solid"} ${s.color || `var(--serie-${si + 1})`}`,
              }}
            />
            {s.name}
          </span>
        ))}
        {events.length > 0 && (
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
        {gapArea && (
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
    </div>
  );
}
