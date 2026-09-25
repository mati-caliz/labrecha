import { BlocAttendance } from "@/components/congress/BlocAttendance";
import { DeputiesComposition } from "@/components/congress/DeputiesComposition";
import { RecentLaws } from "@/components/congress/RecentLaws";
import { SenateComposition } from "@/components/congress/SenateComposition";
import { VotedVsHappened } from "@/components/congress/VotedVsHappened";
import { VotesBoard } from "@/components/congress/VotesBoard";
import { congressQueries } from "@/lib/pageQueries";
import { PrefetchedQueries } from "@/lib/prefetch";
import type { Metadata } from "next";
import type { ReactNode, ReactElement } from "react";

export const metadata: Metadata = {
  title: "Congreso - La Brecha",
  description:
    "Votaciones nominales de Diputados y del Senado y composición del Congreso de Argentina, con su fuente.",
};

function SectionHeading({ children }: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <h2
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: "clamp(1.375rem, 3vw, 1.75rem)",
        letterSpacing: "-0.02em",
        margin: 0,
      }}
    >
      {children}
    </h2>
  );
}

export default async function CongressPage(): Promise<ReactElement> {
  return (
    <PrefetchedQueries queries={await congressQueries()}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 72px" }}>
        <header style={{ borderBottom: "2px solid var(--ink)", paddingBottom: 22, marginBottom: 32 }}>
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
            /congreso · Diputados y Senado
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(2rem, 5vw, 2.875rem)",
              letterSpacing: "-0.025em",
              margin: "0 0 8px",
              color: "var(--ink)",
            }}
          >
            Votaciones nominales
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
            Cómo votó cada bloque en las últimas sesiones, voto por voto.
          </p>
        </header>

        <VotesBoard />

        <div
          style={{
            marginTop: 56,
            borderTop: "2px solid var(--ink)",
            paddingTop: 32,
            display: "flex",
            flexDirection: "column",
            gap: 40,
          }}
        >
          <VotedVsHappened />
          <SenateComposition />
          <DeputiesComposition />
          <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SectionHeading>Últimas leyes sancionadas</SectionHeading>
            <RecentLaws />
          </section>
          <BlocAttendance />
        </div>
      </div>
    </PrefetchedQueries>
  );
}
