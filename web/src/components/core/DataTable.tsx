import type { CSSProperties, ReactNode, ReactElement } from "react";

export interface DataTableColumn {
  key: string;
  label: ReactNode;
  align?: "left" | "right" | "center";
  numeric?: boolean;
}

export interface DataTableRow {
  id: string;
  cells: ReactNode[];
}

interface DataTableProps {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  footer?: ReactNode;
  style?: CSSProperties;
}

export function DataTable({ columns, rows, footer, style }: Readonly<DataTableProps>): ReactElement {
  return (
    <div style={{ overflowX: "auto", ...style }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: "var(--font-jb-mono)",
          fontSize: "0.8125rem",
        }}
      >
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  textAlign: column.align ?? "left",
                  padding: "10px 12px",
                  borderBottom: "1px solid var(--line)",
                  color: "var(--ink3)",
                  fontWeight: 500,
                  fontSize: "0.66rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  whiteSpace: "nowrap",
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} style={{ borderTop: "1px solid var(--line2)" }}>
              {row.cells.map((cell, cellIndex) => {
                const column = columns[cellIndex];
                if (!column) {
                  return null;
                }
                return (
                  <td
                    key={column.key}
                    style={{
                      textAlign: column.align ?? "left",
                      padding: "10px 12px",
                      color: "var(--ink)",
                      fontVariantNumeric: column.numeric ? "tabular-nums" : undefined,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {Boolean(footer) && <div style={{ padding: "10px 12px" }}>{footer}</div>}
    </div>
  );
}
