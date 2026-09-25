"use client";
import { type CSSProperties, type ReactElement } from "react";

import type { GapDef } from "@/lib/gaps";

const RANGE_OPTIONS = ["6M", "1A", "5A", "Máx"];
const MONO = "var(--font-jb-mono)";

const rangeStyle = (active: boolean): CSSProperties => ({
  fontFamily: MONO,
  fontSize: "0.7rem",
  padding: "5px 12px",
  borderRadius: "var(--radius-pill)",
  cursor: "pointer",
  border: active ? "1px solid var(--ink)" : "1px solid var(--line)",
  background: active ? "var(--ink)" : "transparent",
  color: active ? "var(--paper)" : "var(--ink2)",
});

export function GapHeader({
  def,
  range,
  onRangeChange,
}: Readonly<{ def: GapDef; range: string; onRangeChange: (range: string) => void }>): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 18,
      }}
    >
      <div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1.375rem",
            letterSpacing: "-0.015em",
            margin: "0 0 4px",
          }}
        >
          {def.label}
        </h2>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "0.9375rem",
            color: "var(--ink2)",
            margin: 0,
          }}
        >
          {def.subtitle}
        </p>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              onRangeChange(option);
            }}
            style={rangeStyle(option === range)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
