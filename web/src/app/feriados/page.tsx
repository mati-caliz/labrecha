import type { ReactElement } from "react";
import { HolidaysCalendar } from "@/components/holidays/HolidaysCalendar";
import { holidaysQueries } from "@/lib/pageQueries";
import { PrefetchedQueries } from "@/lib/prefetch";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feriados de Argentina - La Brecha",
  description: "Calendario de feriados nacionales de Argentina por año, con su fecha y fuente.",
};

export default function HolidaysPage(): ReactElement {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px 72px" }}>
      <header style={{ borderBottom: "2px solid var(--ink)", paddingBottom: 20, marginBottom: 30 }}>
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
          /feriados
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(2rem, 5vw, 2.75rem)",
            letterSpacing: "-0.025em",
            margin: 0,
            color: "var(--ink)",
          }}
        >
          Feriados de Argentina
        </h1>
      </header>
      <PrefetchedQueries queries={holidaysQueries()}>
        <HolidaysCalendar />
      </PrefetchedQueries>
    </div>
  );
}
