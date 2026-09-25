import { RateComparator } from "@/components/rates/RateComparator";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tasas: billeteras, plazos fijos e hipotecarios UVA - La Brecha",
  description:
    "Compará los rendimientos en pesos de billeteras, tasas de plazo fijo y créditos hipotecarios UVA de entidades argentinas.",
};

export default function RatesPage() {
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
          /tasas
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(2rem, 5vw, 2.75rem)",
            letterSpacing: "-0.025em",
            margin: "0 0 8px",
          }}
        >
          Tasas para comparar
        </h1>
        <p style={{ fontSize: "1.125rem", color: "var(--ink2)", margin: 0, maxWidth: 650 }}>
          Billeteras virtuales, plazo fijo y créditos hipotecarios UVA. Las condiciones cambian: usalo para
          orientar la comparación, no como recomendación.
        </p>
      </header>
      <RateComparator />
    </div>
  );
}
