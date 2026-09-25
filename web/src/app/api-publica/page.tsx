import { SITE_URL } from "@/lib/site";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "API pública - La Brecha",
  description:
    "Los datos del observatorio, disponibles como API de lectura y en CSV: series históricas con su fuente, brechas entre mediciones y cortes por gestión de gobierno.",
  alternates: { canonical: "/api-publica" },
};

const MONO = "var(--font-jb-mono)";
const BASE = `${SITE_URL}/api/data`;

interface Endpoint {
  method: string;
  path: string;
  description: string;
  example: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/indicators",
    description: "Catálogo completo: cada serie con sus fuentes, cantidad de datos y cobertura.",
    example: `curl ${BASE}/indicators`,
  },
  {
    method: "GET",
    path: "/indicators/{code}",
    description: "La serie histórica. Filtrable por fuente y rango, y ordenable. Cada punto trae su fuente.",
    example: `curl "${BASE}/indicators/cpi_monthly?source=argentinadatos&date_from=2023-01-01&order=asc"`,
  },
  {
    method: "GET",
    path: "/indicators/{code}/csv",
    description: "La misma serie en CSV, lista para abrir en una planilla.",
    example: `curl -o inflacion.csv "${BASE}/indicators/cpi_monthly/csv"`,
  },
  {
    method: "GET",
    path: "/indicators/{code}/sources",
    description: "Qué fuentes miden ese indicador, con el último valor de cada una.",
    example: `curl ${BASE}/indicators/international_reserves/sources`,
  },
  {
    method: "GET",
    path: "/gaps",
    description:
      "Las discrepancias entre fuentes que miden el mismo indicador, comparadas sobre una misma fecha y rankeadas.",
    example: `curl ${BASE}/gaps`,
  },
  {
    method: "GET",
    path: "/terms/{code}",
    description:
      "La serie cortada por mandato presidencial, con la variación de cada período y el método usado.",
    example: `curl ${BASE}/terms/cpi_monthly`,
  },
  {
    method: "GET",
    path: "/political-events",
    description: "Los hitos políticos con los que se anotan las series.",
    example: `curl "${BASE}/political-events?date_from=2019-01-01"`,
  },
  {
    method: "GET",
    path: "/scrape-runs",
    description: "La última corrida de cada conector: si falló, cuándo y con qué error.",
    example: `curl ${BASE}/scrape-runs`,
  },
];

const FEEDS = [
  {
    path: "/brechas.xml",
    description: "RSS que avisa cuando dos fuentes difieren. Con ?min=5 sólo trae discrepancias de 5% o más.",
  },
  {
    path: "/indicador/{code}/feed.xml",
    description: "RSS con cada dato nuevo de un indicador, con su fuente y su fecha.",
  },
  { path: "/boletin.xml", description: "RSS del Boletín Oficial resumido." },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 48 }}>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "clamp(1.375rem, 3vw, 1.75rem)",
          letterSpacing: "-0.02em",
          margin: "0 0 16px",
          color: "var(--ink)",
          borderBottom: "2px solid var(--ink)",
          paddingBottom: 12,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre
      style={{
        fontFamily: MONO,
        fontSize: "0.75rem",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 6,
        padding: "10px 12px",
        overflowX: "auto",
        margin: "10px 0 0",
        color: "var(--ink2)",
      }}
    >
      {children}
    </pre>
  );
}

export default function PublicApiPage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 72px" }}>
      <header style={{ borderBottom: "2px solid var(--ink)", paddingBottom: 22 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: "0.72rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ink3)",
            marginBottom: 10,
          }}
        >
          /api-publica
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(2rem, 5vw, 2.875rem)",
            letterSpacing: "-0.025em",
            margin: "0 0 14px",
            color: "var(--ink)",
            textWrap: "balance",
          }}
        >
          Usá nuestros datos
        </h1>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1rem, 2.2vw, 1.1875rem)",
            lineHeight: 1.55,
            color: "var(--ink2)",
            margin: 0,
            maxWidth: 640,
          }}
        >
          Todo lo que ves en el sitio sale de una API de lectura, sin claves ni registro. Es la misma que
          consume esta página. Si vas a usarla, citá a La Brecha y a la fuente original de cada serie.
        </p>
      </header>

      <Section title="Endpoints">
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {ENDPOINTS.map((endpoint) => (
            <div key={endpoint.path}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: "var(--pos)",
                    border: "1px solid var(--line2)",
                    borderRadius: 4,
                    padding: "2px 6px",
                  }}
                >
                  {endpoint.method}
                </span>
                <code style={{ fontFamily: MONO, fontSize: "0.875rem", color: "var(--ink)" }}>
                  {endpoint.path}
                </code>
              </div>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "0.9375rem",
                  lineHeight: 1.5,
                  color: "var(--ink2)",
                  margin: "8px 0 0",
                }}
              >
                {endpoint.description}
              </p>
              <Code>{endpoint.example}</Code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Feeds RSS">
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "0.9375rem",
            lineHeight: 1.6,
            color: "var(--ink2)",
            margin: "0 0 16px",
          }}
        >
          Para seguir un indicador no hace falta crear una cuenta: hay un feed por serie y otro de
          discrepancias, que podés suscribir en cualquier lector de RSS.
        </p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 14 }}>
          {FEEDS.map((feed) => (
            <li key={feed.path}>
              <code style={{ fontFamily: MONO, fontSize: "0.8125rem", color: "var(--ink)" }}>
                {feed.path}
              </code>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "0.9375rem",
                  color: "var(--ink2)",
                  margin: "4px 0 0",
                }}
              >
                {feed.description}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Límites y buena fe">
        <ul
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "0.9375rem",
            lineHeight: 1.65,
            color: "var(--ink2)",
            margin: 0,
            paddingLeft: 20,
            display: "grid",
            gap: 8,
          }}
        >
          <li>
            Hay un límite de consultas por minuto y por IP. Si lo pasás, la API responde{" "}
            <code style={{ fontFamily: MONO, fontSize: "0.8125rem" }}>429</code> con un{" "}
            <code style={{ fontFamily: MONO, fontSize: "0.8125rem" }}>Retry-After</code>.
          </li>
          <li>
            Las respuestas se cachean por ruta. Pedir la misma serie cada un segundo no te va a dar un dato
            más nuevo: el scraper corre con la cadencia de cada fuente.
          </li>
          <li>Si necesitás la serie completa, usá el CSV una vez en lugar de paginar la API muchas veces.</li>
          <li>
            Los datos son de terceros (INDEC, BCRA, datos.gob.ar, HCDN, consultoras). Nosotros los reunimos y
            los publicamos con su fuente y su fecha; la autoridad sobre el dato sigue siendo de quien lo
            midió.
          </li>
        </ul>
      </Section>
    </div>
  );
}
