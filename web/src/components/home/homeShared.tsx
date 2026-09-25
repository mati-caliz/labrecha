import type { CSSProperties, ReactNode } from "react";

export function SectionHead({ index, title, action }: { index: string; title: string; action?: ReactNode }) {
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

export function Eyebrow({ children, color = "var(--gap)" }: { children: ReactNode; color?: string }) {
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

export function SourceChip({ source, date }: { source: string; date: string }) {
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

export function ActionLink({ href, children }: { href: string; children: ReactNode }) {
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

export function MiniSparkline({ data, style }: { data: number[]; style?: CSSProperties }) {
  if (data.length < 2) {
    return null;
  }
  const width = 120;
  const height = 34;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - 2 - ((value - min) / span) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
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
