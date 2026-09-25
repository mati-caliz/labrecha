"use client";
import type { ReactElement } from "react";

import { CARD_STYLE, MONO } from "@/components/indicator/detail/styles";
import type { VariationDisplay } from "@/components/indicator/detail/variation";

export function VariationRow({
  label,
  reference,
  variation,
}: Readonly<{
  label: string;
  reference: string;
  variation: VariationDisplay | undefined;
}>): ReactElement {
  return (
    <div
      style={{
        ...CARD_STYLE,
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: "0.68rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--ink3)",
            marginBottom: 6,
          }}
        >
          {label}
        </div>
        <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--ink3)" }}>{reference}</div>
      </div>
      <span
        style={{
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: "1.5rem",
          fontVariantNumeric: "tabular-nums",
          color: variation?.color ?? "var(--ink3)",
        }}
      >
        {variation?.text ?? "—"}
      </span>
    </div>
  );
}
