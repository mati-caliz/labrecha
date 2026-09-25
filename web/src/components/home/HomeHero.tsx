"use client";
import type { ReactElement } from "react";

import { Eyebrow } from "@/components/home/homeShared";
import { useIndicators, usePoliticalEvents, usePosts } from "@/hooks/useLabrecha";

function StatBlock({
  label,
  value,
  accent,
}: Readonly<{ label: string; value: string; accent?: boolean }>): ReactElement {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-jb-mono)",
          fontSize: "0.68rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink3)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jb-mono)",
          fontWeight: 600,
          fontSize: "2.125rem",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          color: accent ? "var(--gap)" : "var(--ink)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function HomeHero(): ReactElement {
  const indicators = useIndicators();
  const events = usePoliticalEvents();
  const posts = usePosts();

  const format = (value: number | undefined): string => (value === undefined ? "—" : String(value));

  return (
    <section style={{ borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
      <div className="lb-container lb-hero-grid" style={{ paddingTop: 56, paddingBottom: 48 }}>
        <div>
          <Eyebrow>Observatorio político-económico de la Argentina</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(2.25rem, 5.5vw, 3.5rem)",
              lineHeight: 1.0,
              letterSpacing: "-0.025em",
              margin: "20px 0 22px",
              color: "var(--ink)",
              textWrap: "balance",
            }}
          >
            Un país tiene muchas cifras. Mostramos las que{" "}
            <span style={{ color: "var(--gap)" }}>no coinciden</span>.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(1rem, 2vw, 1.25rem)",
              lineHeight: 1.5,
              color: "var(--ink2)",
              margin: 0,
              maxWidth: 560,
              textWrap: "pretty",
            }}
          >
            Reunimos los indicadores dispersos de la Argentina —INDEC, BCRA, el Congreso, consultoras— en un
            solo lugar. Marcamos las series con los hechos políticos que las movieron y exponemos la brecha
            cuando dos fuentes miden distinto.
          </p>
        </div>
        <div
          className="lb-hero-aside"
          style={{
            borderLeft: "1px solid var(--line)",
            paddingLeft: 32,
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          <StatBlock label="Indicadores seguidos" value={format(indicators.data?.length)} />
          <StatBlock label="Eventos anotados" value={format(events.data?.length)} accent />
          <StatBlock label="Ideas publicadas" value={format(posts.data?.length)} />
        </div>
      </div>
    </section>
  );
}
