"use client";

import { CELL_PAD, MONO, NO_DATA_LABEL } from "@/components/indicator/detail/styles";
import { gapPercent } from "@/components/indicator/detail/variation";
import { type IndicatorDisplay, formatDateAR, formatNumberAR, sourceLabel } from "@/lib/indicators";
import type { AlignedSeries } from "@/lib/series";

export interface TableRow {
  date: string;
  values: (number | null)[];
  gap: number | undefined;
}

const TABLE_ROW_LIMIT = 8;

export function buildTableRows(aligned: AlignedSeries): TableRow[] {
  const firstRowIndex = Math.max(0, aligned.axis.length - TABLE_ROW_LIMIT);
  const rows: TableRow[] = [];
  for (let index = aligned.axis.length - 1; index >= firstRowIndex; index -= 1) {
    const values = aligned.lines.map((line) => line.data[index] ?? null);
    rows.push({ date: aligned.axis[index] ?? "", values, gap: gapPercent(values[0], values[1]) });
  }
  return rows;
}

export function SeriesTable({
  indicator,
  aligned,
  rows,
  isComparator,
}: {
  indicator: IndicatorDisplay;
  aligned: AlignedSeries;
  rows: TableRow[];
  isComparator: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p
        style={{
          fontFamily: "var(--font-serif)",
          color: "var(--ink2)",
          margin: 0,
          padding: "18px 24px",
        }}
      >
        Sin datos en el rango seleccionado.
      </p>
    );
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: MONO,
          fontSize: "0.8125rem",
        }}
      >
        <thead>
          <tr
            style={{
              color: "var(--ink3)",
              fontSize: "0.68rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <th style={{ textAlign: "left", padding: CELL_PAD, fontWeight: 500 }}>Fecha</th>
            {aligned.lines.map((line) => (
              <th key={line.source} style={{ textAlign: "right", padding: CELL_PAD, fontWeight: 500 }}>
                {sourceLabel(line.source)}
              </th>
            ))}
            {isComparator ? (
              <th style={{ textAlign: "right", padding: CELL_PAD, fontWeight: 500 }}>Brecha</th>
            ) : null}
          </tr>
        </thead>
        <tbody style={{ color: "var(--ink)" }}>
          {rows.map((row) => (
            <tr key={row.date} style={{ borderTop: "1px solid var(--line2)" }}>
              <td style={{ textAlign: "left", padding: CELL_PAD }}>{formatDateAR(row.date)}</td>
              {row.values.map((value, index) => (
                <td
                  key={aligned.lines[index]?.source ?? index}
                  style={{
                    textAlign: "right",
                    padding: CELL_PAD,
                    fontVariantNumeric: "tabular-nums",
                    color: index === 0 ? "var(--ink)" : "var(--ink2)",
                  }}
                >
                  {value === null ? NO_DATA_LABEL : indicator.format(value)}
                </td>
              ))}
              {isComparator ? (
                <td
                  style={{
                    textAlign: "right",
                    padding: CELL_PAD,
                    color: "var(--gap)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {row.gap === undefined ? "—" : `${formatNumberAR(row.gap, 1)}%`}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
