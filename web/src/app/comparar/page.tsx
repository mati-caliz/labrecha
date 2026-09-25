import { JsonLd } from "@/components/JsonLd";
import { IndicatorComparator } from "@/components/indicator/IndicatorComparator";
import { breadcrumbStructuredData } from "@/lib/structuredData";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Comparar indicadores - La Brecha",
  description:
    "Poné dos series económicas argentinas en el mismo eje, indexadas a 100 en su primer mes en común, y mirá cuál corrió más rápido. Salario contra inflación, jubilación contra canasta, dólar contra precios.",
  alternates: { canonical: "/comparar" },
};

export default function ComparePage() {
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
      <JsonLd data={breadcrumbStructuredData([{ name: "Comparar indicadores", path: "/comparar" }])} />
      <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1
          style={{
            font: "var(--fw-bold) var(--fs-h1)/var(--lh-heading) var(--font-display)",
            color: "var(--ink)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Comparar indicadores
        </h1>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.0625rem",
            color: "var(--ink2)",
            margin: 0,
            maxWidth: "60ch",
          }}
        >
          Dos series en el mismo eje, las dos arrancando en 100 en el primer mes que ambas midieron. Así se ve
          quién le ganó a quién sin que la diferencia de escala confunda: el salario contra la inflación, la
          jubilación contra la canasta, el dólar contra los precios.
        </p>
      </header>

      <Suspense fallback={null}>
        <IndicatorComparator />
      </Suspense>
    </div>
  );
}
