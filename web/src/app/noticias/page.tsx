import { NewsFeed } from "@/components/news/NewsFeed";
import { newsQueries } from "@/lib/pageQueries";
import { PrefetchedQueries } from "@/lib/prefetch";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Noticias económicas - La Brecha",
  description:
    "Últimos titulares de economía de Argentina, con su fuente y fecha, enlazados a la nota original.",
};

export default function NewsPage() {
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 72px" }}>
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          borderBottom: "2px solid var(--ink)",
          paddingBottom: 20,
          marginBottom: 32,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
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
            /noticias
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(2rem, 5vw, 2.875rem)",
              letterSpacing: "-0.025em",
              margin: 0,
              color: "var(--ink)",
            }}
          >
            Titulares del día
          </h1>
        </div>
        <span style={{ fontFamily: "var(--font-jb-mono)", fontSize: "0.72rem", color: "var(--ink3)" }}>
          Agregado de medios · con enlace a la fuente
        </span>
      </header>
      <PrefetchedQueries queries={newsQueries()}>
        <NewsFeed />
      </PrefetchedQueries>
    </div>
  );
}
