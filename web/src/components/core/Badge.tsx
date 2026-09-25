import type { CSSProperties, ReactNode, ReactElement } from "react";

export type BadgeTone = "neutral" | "accent" | "pos" | "neg" | "gap" | "evento";

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  style?: CSSProperties;
}

const tones: Record<BadgeTone, CSSProperties> = {
  neutral: {
    background: "var(--surface)",
    color: "var(--ink2)",
    border: "1px solid var(--line)",
  },
  accent: {
    background: "var(--event-bg)",
    color: "var(--event)",
    border: "1px solid var(--event-ln)",
  },
  pos: { background: "var(--pos-bg)", color: "var(--pos)", border: "1px solid transparent" },
  neg: { background: "var(--neg-bg)", color: "var(--neg)", border: "1px solid transparent" },
  gap: { background: "var(--gap-bg)", color: "var(--gap)", border: "1px solid var(--gap-ln)" },
  evento: {
    background: "var(--event-bg)",
    color: "var(--event)",
    border: "1px solid var(--event-ln)",
  },
};

export function Badge({ tone = "neutral", children, style }: Readonly<BadgeProps>): ReactElement {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 9px",
        borderRadius: "var(--radius-pill)",
        fontFamily: "var(--font-jb-mono)",
        fontSize: "0.62rem",
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        lineHeight: 1.5,
        ...tones[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
