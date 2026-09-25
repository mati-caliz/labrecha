import type { CSSProperties, ReactNode, ReactElement } from "react";

export function SectionHead({
  index,
  title,
  action,
}: Readonly<{ index: string; title: string; action?: ReactNode }>): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        borderBottom: "2px solid var(--ink)",
        paddingBottom: 14,
        marginBottom: 32,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "var(--font-jb-mono)",
            fontSize: "0.7rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ink3)",
            marginBottom: 8,
          }}
        >
          Sección {index}
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(1.75rem, 3.5vw, 2.125rem)",
            letterSpacing: "-0.02em",
            margin: 0,
            color: "var(--ink)",
          }}
        >
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function Eyebrow({
  children,
  color = "var(--gap)",
}: Readonly<{ children: ReactNode; color?: string }>): ReactElement {
  return (
    <div
      style={{
        fontFamily: "var(--font-jb-mono)",
        fontSize: "0.7rem",
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color,
      }}
    >
      {children}
    </div>
  );
}

export function SourceChip({ source, date }: Readonly<{ source: string; date: string }>): ReactElement {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-jb-mono)",
        fontSize: "0.7rem",
        color: "var(--ink2)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-pill)",
        padding: "4px 11px",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ink3)" }} />
      {source} · {date}
    </span>
  );
}

export function ActionLink({
  href,
  children,
}: Readonly<{ href: string; children: ReactNode }>): ReactElement {
  return (
    <a
      href={href}
      style={{
        fontFamily: "var(--font-jb-mono)",
        fontSize: "0.78rem",
        color: "var(--ink2)",
        borderBottom: "1px solid var(--line)",
        paddingBottom: 2,
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </a>
  );
}

const SPARKLINE_VERTICAL_PADDING = 2;

export function MiniSparkline({
  data,
  style,
}: Readonly<{ data: number[]; style?: CSSProperties }>): ReactElement | null {
  if (data.length < 2) {
    return null;
  }
  const width = 120;
  const height = 34;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const span = range === 0 || Number.isNaN(range) ? 1 : range;
  const points = data
    .map((value, index) => {
      const pointX = (index / (data.length - 1)) * width;
      const pointY =
        height -
        SPARKLINE_VERTICAL_PADDING -
        ((value - min) / span) * (height - 2 * SPARKLINE_VERTICAL_PADDING);
      return `${pointX.toFixed(1)},${pointY.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: 26, display: "block", ...style }}
      role="img"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--chart)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
