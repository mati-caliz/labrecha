"use client";

import { QueryError } from "@/components/QueryError";
import { labrechaApi } from "@/lib/labrechaApi";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

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

const TABS: Array<{ id: Tab; label: string; lead: string; best: string }> = [
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

function details(row: Rate): string | null {
  return (
    Object.entries(row.details)
      .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
      .join(" · ") || null
  );
}

export function RateComparator() {
  const [tab, setTab] = useState<Tab>("wallets");
  const active = TABS.find((item) => item.id === tab) ?? TABS[0];
  const query = useQuery({
    queryKey: ["rates", tab],
    queryFn: async () => (await labrechaApi.get<Rate[]>(`/rates/${tab}`)).data,
    staleTime: 15 * 60 * 1000,
  });
  const ordered = query.data ?? [];
  const best = ordered[0]?.id;

  return (
    <section>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
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
      {query.isError ? (
        <QueryError error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <p>Cargando tasas…</p>
      ) : (
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
                <tr key={row.id} style={{ borderBottom: "1px solid var(--line2)" }}>
                  <td
                    style={{
                      padding: 14,
                      color: "var(--ink)",
                      fontWeight: row.id === best ? 700 : 500,
                    }}
                  >
                    {row.name}
                    {row.id === best && (
                      <span
                        style={{
                          display: "block",
                          color: "var(--gap)",
                          fontSize: "0.65rem",
                          marginTop: 4,
                        }}
                      >
                        ◆ {active?.best}
                      </span>
                    )}
                  </td>
                  <td style={{ color: "var(--ink)", fontWeight: 700 }}>{percent.format(Number(row.tna))}%</td>
                  <td style={{ color: "var(--ink2)", padding: "14px 10px" }}>
                    {row.product}
                    {details(row) && (
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
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ color: "var(--ink3)", fontSize: "0.82rem", lineHeight: 1.5, marginTop: 14 }}>
        Las tasas informan una referencia, no una oferta ni recomendación. En hipotecarios UVA la cuota y el
        capital se ajustan por UVA; revisá siempre las condiciones vigentes de cada entidad.
      </p>
    </section>
  );
}
