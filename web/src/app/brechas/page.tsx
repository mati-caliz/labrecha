import { GapComparison } from "@/components/indicator/GapComparison";
import { GapRankList } from "@/components/indicator/GapRankList";
import { SourceGapList } from "@/components/indicator/SourceGapList";
import { GAPS } from "@/lib/gaps";
import type { SourceGap } from "@/lib/labrechaApi";
import { gapsQueries } from "@/lib/pageQueries";
import { PrefetchedQueries } from "@/lib/prefetch";
import { sourceGapsQuery } from "@/lib/queries";
import { gapsDescription } from "@/lib/seoDescriptions";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const gaps = await sourceGapsQuery()
    .queryFn()
    .catch(() => [] as SourceGap[]);
  return {
    title: "Brechas entre mediciones - La Brecha",
    description: gapsDescription(gaps),
    alternates: { canonical: "/brechas" },
  };
}

export default function GapsPage() {
  return (
    <PrefetchedQueries queries={gapsQueries()}>
      <div>
        <section style={{ background: "var(--gap-bg)", borderBottom: "1px solid var(--gap-ln)" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "52px 24px 46px" }}>
            <div
              style={{
                fontFamily: "var(--font-jb-mono)",
                fontSize: "0.72rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--gap)",
                marginBottom: 16,
              }}
            >
              ◆ /brechas
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "clamp(2.25rem, 6vw, 3.25rem)",
                lineHeight: 1.0,
                letterSpacing: "-0.025em",
                margin: "0 0 18px",
                maxWidth: 820,
                color: "var(--ink)",
                textWrap: "balance",
              }}
            >
              Cuando dos fuentes miden lo mismo y no coinciden
            </h1>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(1rem, 2.2vw, 1.25rem)",
                lineHeight: 1.5,
                color: "var(--ink2)",
                margin: 0,
                maxWidth: 660,
                textWrap: "pretty",
              }}
            >
              Las discrepancias que seguimos, ordenadas por magnitud. Cada brecha compara dos mediciones del
              mismo fenómeno y muestra la fuente y la fecha de cada una.
            </p>
          </div>
        </section>

        <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px 72px" }}>
          <GapRankList />

          <div style={{ marginTop: 56, borderTop: "2px solid var(--ink)", paddingTop: 32 }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
                letterSpacing: "-0.02em",
                margin: "0 0 10px",
              }}
            >
              El mismo indicador, medido por dos fuentes
            </h2>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1rem",
                lineHeight: 1.5,
                color: "var(--ink2)",
                margin: "0 0 24px",
                maxWidth: 660,
              }}
            >
              Estas no están curadas: salen solas de los datos. Cada vez que dos fuentes publican el mismo
              indicador para una misma fecha, la discrepancia aparece acá, ordenada por magnitud.
            </p>
            <SourceGapList />
          </div>

          <div style={{ marginTop: 56, borderTop: "2px solid var(--ink)", paddingTop: 32 }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
                letterSpacing: "-0.02em",
                margin: "0 0 24px",
              }}
            >
              El detalle de cada brecha
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {GAPS.map((def) => (
                <section key={def.id} id={def.id} style={{ scrollMarginTop: 80 }}>
                  <GapComparison id={def.id} />
                </section>
              ))}
            </div>
          </div>
        </main>
      </div>
    </PrefetchedQueries>
  );
}
