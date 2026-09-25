import type { ReactElement } from "react";
export function CalculatorHeader({
  title,
  subtitle,
}: Readonly<{ title: string; subtitle: string }>): ReactElement {
  return (
    <header style={{ borderBottom: "2px solid var(--ink)", paddingBottom: 22, marginBottom: 26 }}>
      <div
        style={{
          fontFamily: "var(--font-jb-mono)",
          fontSize: "0.72rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--ink3)",
          marginBottom: 10,
        }}
      >
        /calculadoras
      </div>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "clamp(2rem, 5vw, 2.75rem)",
          letterSpacing: "-0.025em",
          margin: "0 0 8px",
          color: "var(--ink)",
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "clamp(1rem, 2vw, 1.125rem)",
          color: "var(--ink2)",
          margin: 0,
          maxWidth: 620,
        }}
      >
        {subtitle}
      </p>
    </header>
  );
}
