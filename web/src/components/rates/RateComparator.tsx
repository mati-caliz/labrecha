"use client";

import { QueryError } from "@/components/QueryError";
import { labrechaApi } from "@/lib/labrechaApi";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { hasText } from "@/lib/utils";

type Tab = "wallets" | "fixed-term" | "uva-mortgages";
interface Rate {
  id: string;
  name: string;
  tna: string;
  tea: string | null;
  product: string;
  updated_at: string | null;
  details: Record<string, string | number>;
  link: string | null;
}

const TABS: { id: Tab; label: string; lead: string; best: string }[] = [
  {
    id: "wallets",
    label: "Billeteras",
    lead: "Rendimientos anuales en pesos",
    best: "Mayor rendimiento",
  },
  {
    id: "fixed-term",
    label: "Plazo fijo",
    lead: "TNA online para clientes · referencia 30 días",
    best: "Mayor TNA",
  },
  {
    id: "uva-mortgages",
    label: "Hipotecarios UVA",
    lead: "TNA inicial; el crédito también ajusta por UVA",
    best: "Menor TNA",
  },
];

const percent = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

const RATES_STALE_TIME_MS = 15 * 60 * 1000;
const BEST_ROW_FONT_WEIGHT = 700;
const REGULAR_ROW_FONT_WEIGHT = 500;

function details(row: Rate): string | null {
  return (
    Object.entries(row.details)
      .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
      .join(" · ") || null
  );
}

function RateRow({
  row,
  isBest,
  bestLabel,
}: Readonly<{ row: Rate; isBest: boolean; bestLabel: string | undefined }>): ReactElement {
  return (
    <tr style={{ borderBottom: "1px solid var(--line2)" }}>
      <td
        style={{
          padding: 14,
          color: "var(--ink)",
          fontWeight: isBest ? BEST_ROW_FONT_WEIGHT : REGULAR_ROW_FONT_WEIGHT,
        }}
      >
        {row.name}
        {isBest && (
          <span
            style={{
              display: "block",
              color: "var(--gap)",
              fontSize: "0.65rem",
              marginTop: 4,
            }}
          >
            ◆ {bestLabel}
          </span>
        )}
      </td>
      <td style={{ color: "var(--ink)", fontWeight: 700 }}>{percent.format(Number(row.tna))}%</td>
      <td style={{ color: "var(--ink2)", padding: "14px 10px" }}>
        {row.product}
        {hasText(details(row)) && (
          <span
            style={{
              display: "block",
              color: "var(--ink3)",
              fontSize: "0.68rem",
              marginTop: 4,
            }}
          >
            {details(row)}
          </span>
        )}
      </td>
      <td style={{ color: "var(--ink3)", padding: "14px 10px" }}>
        {row.updated_at ?? "último relevamiento"}
      </td>
    </tr>
  );
}

function RatesTable({
  ordered,
  bestLabel,
}: Readonly<{ ordered: Rate[]; bestLabel: string | undefined }>): ReactElement {
  const best = ordered[0]?.id;
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 10,
        overflow: "auto",
        background: "var(--surface)",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: 620,
          fontFamily: "var(--font-jb-mono)",
          fontSize: "0.78rem",
        }}
      >
        <thead>
          <tr
            style={{
              textAlign: "left",
              color: "var(--ink3)",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <th style={{ padding: 14 }}>Entidad</th>
            <th>TNA</th>
            <th>Producto / condiciones</th>
            <th>Actualizado</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((row) => (
            <RateRow key={row.id} row={row} isBest={row.id === best} bestLabel={bestLabel} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RateComparator(): ReactElement {
  const [tab, setTab] = useState<Tab>("wallets");
  const active = TABS.find((item) => item.id === tab) ?? TABS[0];
  const query = useQuery({
    queryKey: ["rates", tab],
    queryFn: async () => (await labrechaApi.get<Rate[]>(`/rates/${tab}`)).data,
    staleTime: RATES_STALE_TIME_MS,
  });

  function renderRates(): ReactElement {
    if (query.isError) {
      return (
        <QueryError
          error={query.error}
          onRetry={() => {
            void query.refetch();
          }}
        />
      );
    }
    if (query.isLoading) {
      return <p>Cargando tasas…</p>;
    }
    return <RatesTable ordered={query.data ?? []} bestLabel={active?.best} />;
  }

  return (
    <section>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
            }}
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-pill)",
              padding: "9px 14px",
              cursor: "pointer",
              fontFamily: "var(--font-jb-mono)",
              fontSize: "0.76rem",
              color: tab === item.id ? "var(--paper)" : "var(--ink2)",
              background: tab === item.id ? "var(--ink)" : "var(--surface)",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p
        style={{
          fontFamily: "var(--font-jb-mono)",
          color: "var(--ink3)",
          fontSize: "0.75rem",
          margin: "0 0 14px",
        }}
      >
        {active?.lead} · fuente: Argentina Datos · actualización cada 15 min
      </p>
      {renderRates()}
      <p style={{ color: "var(--ink3)", fontSize: "0.82rem", lineHeight: 1.5, marginTop: 14 }}>
        Las tasas informan una referencia, no una oferta ni recomendación. En hipotecarios UVA la cuota y el
        capital se ajustan por UVA; revisá siempre las condiciones vigentes de cada entidad.
      </p>
    </section>
  );
}
