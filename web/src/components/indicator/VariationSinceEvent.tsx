"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useIndicatorVariation, usePoliticalEvents } from "@/hooks/useLabrecha";
import { formatDateAR, formatNumberAR, getIndicatorDisplay, sourceLabel } from "@/lib/indicators";
import type { PoliticalEvent, TermMethod } from "@/lib/labrechaApi";
import { type CSSProperties, useState } from "react";

const MONO = "var(--font-jb-mono)";
const CHANGE_DECIMALS = 1;

const METHOD_NOTE: Record<TermMethod, string> = {
  COMPOUNDED: "Acumulado componiendo las tasas mensuales desde el evento: no es la suma de los meses.",
  ENDPOINTS: "Variación entre el primer dato posterior al evento y el último disponible.",
};

const EVENT_CATEGORY_LABELS: Record<string, string> = {
  cambio_gobierno: "Cambio de gobierno",
  medida_economica: "Medida económica",
  eleccion: "Elección",
  dnu: "DNU",
  ley: "Ley",
};

function categoryLabel(category: string): string {
  return EVENT_CATEGORY_LABELS[category] ?? category;
}

function changeColor(change: number, goodWhen: "up" | "down" | "neutral"): string {
  if (change === 0 || goodWhen === "neutral") {
    return "var(--ink2)";
  }
  const good = goodWhen === "up" ? change > 0 : change < 0;
  return good ? "var(--pos)" : "var(--neg)";
}

function formatChange(change: number): string {
  const sign = change > 0 ? "+" : "";
  return `${sign}${formatNumberAR(change, CHANGE_DECIMALS)} %`;
}

const selectStyle: CSSProperties = {
  fontFamily: MONO,
  fontSize: "0.8rem",
  padding: "8px 10px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--line2)",
  background: "var(--raise)",
  color: "var(--ink)",
  maxWidth: "100%",
};

function eventOptionLabel(event: PoliticalEvent): string {
  return `${formatDateAR(event.date)} · ${event.title}`;
}

export function VariationSinceEvent({ code, source }: { code: string; source: string | undefined }) {
  const indicator = getIndicatorDisplay(code);
  const { data: events } = usePoliticalEvents();
  const [selectedDate, setSelectedDate] = useState("");

  const available = [...(events ?? [])].sort((first, second) =>
    first.date < second.date ? 1 : first.date > second.date ? -1 : 0,
  );
  const selected = available.find((event) => event.date === selectedDate);

  const variation = useIndicatorVariation(
    code,
    { date_from: selectedDate, ...(source === undefined ? {} : { source }) },
    selected !== undefined,
  );

  if (available.length === 0) {
    return null;
  }

  return (
    <section style={{ marginTop: 44 }}>
      <div style={{ borderBottom: "2px solid var(--ink)", paddingBottom: 14, marginBottom: 18 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: "0.66rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--event)",
            marginBottom: 8,
          }}
        >
          ◆ Desde un evento político
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(1.25rem, 3vw, 1.625rem)",
            letterSpacing: "-0.02em",
            margin: 0,
            color: "var(--ink)",
          }}
        >
          Cuánto se movió desde…
        </h2>
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 560 }}>
        <span style={{ fontFamily: MONO, fontSize: "0.66rem", color: "var(--ink3)" }}>Elegí un evento</span>
        <select
          value={selectedDate}
          onChange={(changeEvent) => setSelectedDate(changeEvent.target.value)}
          style={selectStyle}
        >
          <option value="">—</option>
          {available.map((event) => (
            <option key={`${event.date}-${event.title}`} value={event.date}>
              {eventOptionLabel(event)}
            </option>
          ))}
        </select>
      </label>

      {selected === undefined ? null : variation.isLoading ? (
        <Skeleton className="mt-4 h-[92px] w-full rounded-[10px]" />
      ) : variation.data === undefined ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "0.9375rem",
            color: "var(--ink2)",
            marginTop: 16,
          }}
        >
          No hay al menos dos mediciones de {indicator.label} posteriores al {formatDateAR(selected.date)},
          así que no se puede calcular la variación desde ese evento.
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: 28,
            marginTop: 18,
            padding: "18px 20px",
            border: "1px solid var(--event-ln, var(--line))",
            borderRadius: 10,
            background: "var(--surface)",
          }}
        >
          <div>
            <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--ink3)" }}>
              {categoryLabel(selected.category)} · {formatDateAR(selected.date)}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "1rem",
                color: "var(--ink)",
                marginTop: 4,
                maxWidth: 420,
              }}
            >
              {selected.title}
            </div>
          </div>

          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div
              className="num"
              style={{
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: "2rem",
                lineHeight: 1,
                color: changeColor(Number.parseFloat(variation.data.change_pct), indicator.goodWhen),
              }}
            >
              {formatChange(Number.parseFloat(variation.data.change_pct))}
            </div>
            <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--ink3)", marginTop: 6 }}>
              {indicator.format(Number.parseFloat(variation.data.first_value))} →{" "}
              {indicator.format(Number.parseFloat(variation.data.last_value))}
            </div>
          </div>
        </div>
      )}

      {variation.data === undefined ? null : (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "0.875rem",
            color: "var(--ink3)",
            marginTop: 14,
          }}
        >
          {METHOD_NOTE[variation.data.method]} Medido entre el {formatDateAR(variation.data.first_date)} y el{" "}
          {formatDateAR(variation.data.last_date)} ({variation.data.points} mediciones) según{" "}
          {sourceLabel(variation.data.source)}. Que el indicador se haya movido después del evento no
          significa que el evento lo haya causado.
        </p>
      )}
    </section>
  );
}
