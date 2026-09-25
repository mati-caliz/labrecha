"use client";

import { useState } from "react";

export interface HemicycleSeat {
  id: string;
  occupantName: string;
  bloc: string;
  detailLines: string[];
}

export interface HemicycleBloc {
  name: string;
  count: number;
  color: string;
}

interface HemicycleChartProps {
  seats: HemicycleSeat[];
  blocs: HemicycleBloc[];
  ariaLabel: string;
  majority?: number;
}

const VIEW_WIDTH = 200;
const VIEW_HEIGHT = 112;
const CENTER_X = VIEW_WIDTH / 2;
const CENTER_Y = 104;
const OUTER_RADIUS = 94;
const INNER_RADIUS = 40;
const SEAT_RADIUS_FACTOR = 0.42;
const MIN_ROWS = 3;
const SEATS_PER_ROW_UNIT = 4.5;

interface SeatPosition {
  x: number;
  y: number;
  angle: number;
  seatRadius: number;
}

function distributeSeatsByRow(total: number, rowRadii: number[]): number[] {
  const radiiSum = rowRadii.reduce((sum, radius) => sum + radius, 0);
  const counts = rowRadii.map((radius) => Math.floor((total * radius) / radiiSum));
  let assigned = counts.reduce((sum, count) => sum + count, 0);
  let rowIndex = rowRadii.length - 1;
  while (assigned < total) {
    const targetRow = rowIndex % rowRadii.length;
    counts[targetRow] = (counts[targetRow] ?? 0) + 1;
    assigned += 1;
    rowIndex -= 1;
  }
  return counts;
}

function computeSeatPositions(total: number): SeatPosition[] {
  const rows = Math.max(MIN_ROWS, Math.round(Math.sqrt(total / SEATS_PER_ROW_UNIT)));
  const rowSeparation = rows > 1 ? (OUTER_RADIUS - INNER_RADIUS) / (rows - 1) : 0;
  const rowRadii = Array.from({ length: rows }, (_, rowNumber) => INNER_RADIUS + rowNumber * rowSeparation);
  const seatsPerRow = distributeSeatsByRow(total, rowRadii);

  const minArcSpacing = Math.min(
    ...rowRadii.map((radius, rowNumber) =>
      (seatsPerRow[rowNumber] ?? 0) > 0
        ? (Math.PI * radius) / (seatsPerRow[rowNumber] ?? 1)
        : Number.POSITIVE_INFINITY,
    ),
  );
  const seatRadius = SEAT_RADIUS_FACTOR * Math.min(rows > 1 ? rowSeparation : minArcSpacing, minArcSpacing);

  const positions: SeatPosition[] = [];
  rowRadii.forEach((radius, rowNumber) => {
    const count = seatsPerRow[rowNumber] ?? 0;
    for (let seatNumber = 0; seatNumber < count; seatNumber += 1) {
      const angle = Math.PI * (1 - (seatNumber + 0.5) / count);
      positions.push({
        x: CENTER_X + radius * Math.cos(angle),
        y: CENTER_Y - radius * Math.sin(angle),
        angle,
        seatRadius,
      });
    }
  });
  return positions.sort((first, second) => second.angle - first.angle);
}

export function BlocLegend({ blocs }: { blocs: HemicycleBloc[] }) {
  return (
    <div
      style={{
        display: "grid",
        gap: "6px 16px",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      }}
    >
      {blocs.map((bloc) => (
        <div key={bloc.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8125rem" }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: bloc.color,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: "var(--ink2)",
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {bloc.name}
          </span>
          <span className="num" style={{ fontWeight: 600 }}>
            {bloc.count}
          </span>
        </div>
      ))}
    </div>
  );
}

export function HemicycleChart({ seats, blocs, ariaLabel, majority }: HemicycleChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const positions = computeSeatPositions(seats.length);
  const colorByBloc = new Map(blocs.map((bloc) => [bloc.name, bloc.color]));
  const hoveredSeat = hoveredIndex !== null ? seats[hoveredIndex] : null;
  const hoveredPosition = hoveredIndex !== null ? positions[hoveredIndex] : undefined;
  const tooltipOnLeftHalf = hoveredPosition !== undefined && hoveredPosition.x > CENTER_X;

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        style={{ width: "100%", height: "auto", display: "block" }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {majority !== undefined && (
          <g>
            <line
              x1={CENTER_X}
              y1={CENTER_Y - OUTER_RADIUS - 2}
              x2={CENTER_X}
              y2={CENTER_Y - INNER_RADIUS + 8}
              stroke="var(--ink3)"
              strokeWidth={0.7}
              strokeDasharray="2 2"
            />
            <text
              x={CENTER_X}
              y={CENTER_Y - OUTER_RADIUS - 5}
              textAnchor="middle"
              style={{
                fontSize: 5.5,
                fontWeight: 600,
                fill: "var(--ink3)",
                fontFamily: "var(--font-display)",
              }}
            >
              {`Mayoría: ${majority} bancas`}
            </text>
          </g>
        )}
        {positions.map((position, index) => {
          const seat = seats[index];
          if (!seat) {
            return null;
          }
          const hovered = hoveredIndex === index;
          return (
            <circle
              key={seat.id}
              cx={position.x}
              cy={position.y}
              r={hovered ? position.seatRadius * 1.35 : position.seatRadius}
              fill={colorByBloc.get(seat.bloc) ?? "var(--ink3)"}
              stroke={hovered ? "var(--ink)" : "var(--raise)"}
              strokeWidth={hovered ? 0.8 : 0.5}
              style={{ cursor: "default", transition: "r 80ms ease-out" }}
              onMouseEnter={() => setHoveredIndex(index)}
            />
          );
        })}
      </svg>
      {hoveredSeat && hoveredPosition && (
        <div
          style={{
            position: "absolute",
            left: `${(hoveredPosition.x / VIEW_WIDTH) * 100}%`,
            top: `${(hoveredPosition.y / VIEW_HEIGHT) * 100}%`,
            transform: tooltipOnLeftHalf ? "translate(-100%, -110%)" : "translate(0, -110%)",
            pointerEvents: "none",
            zIndex: 10,
            background: "var(--raise)",
            border: "1px solid var(--line2)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-overlay)",
            padding: "8px 10px",
            minWidth: 150,
            maxWidth: 220,
          }}
        >
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink)" }}>
            {hoveredSeat.occupantName}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.6875rem",
              color: "var(--ink2)",
              marginTop: 2,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: colorByBloc.get(hoveredSeat.bloc) ?? "var(--ink3)",
                flexShrink: 0,
              }}
            />
            {hoveredSeat.bloc}
          </div>
          {hoveredSeat.detailLines.map((line) => (
            <div key={line} style={{ fontSize: "0.6875rem", color: "var(--ink3)", marginTop: 2 }}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
