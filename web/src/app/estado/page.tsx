import { ErrorEvents } from "@/components/status/ErrorEvents";
import { FreshnessBoard } from "@/components/status/FreshnessBoard";
import { ScrapeStatus } from "@/components/status/ScrapeStatus";
import { scrapeStatusQueries } from "@/lib/pageQueries";
import { PrefetchedQueries } from "@/lib/prefetch";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Estado del observatorio - La Brecha",
  description:
    "Salud del scraper de La Brecha: última corrida de cada conector, filas ingeridas y errores. La transparencia del pipeline es parte del observatorio.",
};

export default function StatusPage() {
  return (
    <div
      style={{
        maxWidth: "var(--container-max)",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "var(--sp-6)",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h1
          style={{
            font: "var(--fw-bold) var(--fs-h1)/var(--lh-heading) var(--font-display)",
            color: "var(--ink)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Estado del observatorio
        </h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--ink3)", margin: 0 }}>
          La salud del pipeline de datos, a la vista. Cada conector reporta su última corrida: cuándo fue,
          cuántas filas ingirió y si falló. Un dato viejo se muestra con su fecha; nunca se oculta.
        </p>
      </header>

      <PrefetchedQueries queries={scrapeStatusQueries()}>
        <ScrapeStatus />
        <ErrorEvents />
        <FreshnessBoard />
      </PrefetchedQueries>
    </div>
  );
}
