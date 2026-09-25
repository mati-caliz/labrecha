import type { ReactElement } from "react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Calculadoras - La Brecha",
  description:
    "Calculadoras financieras de Argentina: sueldo neto, ajuste por inflación, interés compuesto e impacto fiscal.",
};

const CALCULATORS = [
  {
    href: "/calculadora-sueldo-neto",
    title: "Sueldo neto",
    description: "Estimá tu sueldo de bolsillo con las deducciones de ley y Ganancias.",
  },
  {
    href: "/calculadora-ajuste-inflacion",
    title: "Ajuste por inflación",
    description: "Cuánto vale hoy un monto de otra fecha, según el IPC del INDEC.",
  },
  {
    href: "/calculadora-interes-compuesto",
    title: "Interés compuesto",
    description: "Proyectá cómo crece un capital con capitalización periódica y aportes.",
  },
  {
    href: "/calculadora-impacto-fiscal",
    title: "Impacto fiscal",
    description: "Cuánto de tu ingreso se va en impuestos y hasta qué día trabajás para el Estado.",
  },
];

export default function CalculatorsPage(): ReactElement {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px 72px" }}>
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
          Calculadoras
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
          Herramientas para poner números concretos a lo que pasa con tu plata. Cálculos orientativos, con la
          fuente de cada parámetro a la vista.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        {CALCULATORS.map((calculator) => (
          <Link
            key={calculator.href}
            href={calculator.href}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background: "var(--raise)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              padding: "24px 24px 22px",
              textDecoration: "none",
              color: "var(--ink)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "1.375rem",
                letterSpacing: "-0.015em",
                margin: 0,
              }}
            >
              {calculator.title}
            </h2>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "0.97rem",
                lineHeight: 1.45,
                color: "var(--ink2)",
                margin: 0,
              }}
            >
              {calculator.description}
            </p>
            <span
              style={{
                fontFamily: "var(--font-jb-mono)",
                fontSize: "0.72rem",
                color: "var(--gap)",
                marginTop: 4,
              }}
            >
              Abrir →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
