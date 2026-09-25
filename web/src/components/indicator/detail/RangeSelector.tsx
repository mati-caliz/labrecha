"use client";

import { MONO, RANGE_OPTIONS } from "@/components/indicator/detail/styles";

export function RangeSelector({
  range,
  onRangeChange,
}: {
  range: string;
  onRangeChange: (range: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
      {RANGE_OPTIONS.map((option) => {
        const active = option === range;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onRangeChange(option)}
            style={{
              fontFamily: MONO,
              fontSize: "0.75rem",
              padding: "7px 15px",
              borderRadius: "var(--radius-pill)",
              cursor: "pointer",
              border: active ? "1px solid var(--ink)" : "1px solid var(--line)",
              background: active ? "var(--ink)" : "transparent",
              color: active ? "var(--paper)" : "var(--ink2)",
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
