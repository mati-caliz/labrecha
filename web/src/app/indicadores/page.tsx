import { IndicatorCatalog } from "@/components/indicator/IndicatorCatalog";
import { indicatorCatalogQueries } from "@/lib/pageQueries";
import { PrefetchedQueries } from "@/lib/prefetch";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Indicadores - La Brecha",
  description:
    "Catálogo completo de indicadores político-económicos de Argentina: precios, dólar, monetario, fiscal, empleo y social, con su fuente y fecha.",
};

export default function IndicatorsPage() {
  return (
    <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "44px 24px 72px" }}>
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
          /indicadores
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
          Todos los indicadores
        </h1>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1rem, 2vw, 1.125rem)",
            color: "var(--ink2)",
            margin: 0,
            maxWidth: 560,
          }}
        >
          Las series económicas y sociales de la Argentina que reúne el observatorio, agrupadas por familia.
          Cada una abre su serie histórica anotada, con fuente y fecha.
        </p>
      </header>
      <PrefetchedQueries queries={indicatorCatalogQueries()}>
        <IndicatorCatalog />
      </PrefetchedQueries>
    </div>
  );
}
