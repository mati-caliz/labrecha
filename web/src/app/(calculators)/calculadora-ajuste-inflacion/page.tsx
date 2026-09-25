"use client";

import { CalculatorHeader } from "@/components/calculators/CalculatorHeader";
import { Button, Card } from "@/components/core";
import { formatMoneyAR, formatNumberAR } from "@/lib/indicators";
import { calculatorsApi } from "@/lib/labrechaApi";
import type { InflationAdjustmentRequest, InflationAdjustmentResponse } from "@/lib/labrechaApi";
import { useMutation } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";

const fieldStyle = { display: "flex", flexDirection: "column" as const, gap: 4 };
const inputStyle = {
  padding: "8px 10px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--line2)",
  background: "var(--raise)",
  color: "var(--ink)",
  fontFamily: "var(--font-jb-mono)",
  fontSize: "0.9375rem",
};
const labelStyle = { fontSize: "0.75rem", fontWeight: 600, color: "var(--ink2)" };
const DEFAULT_AMOUNT = 100000;

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");
  return `${monthNumber}/${year}`;
}

interface InflationResultCardProps {
  result: InflationAdjustmentResponse;
  fromMonth: string;
  toMonth: string;
}

function InflationResultCard({
  result,
  fromMonth,
  toMonth,
}: Readonly<InflationResultCardProps>): ReactElement {
  return (
    <Card
      title="Resultado"
      footer={
        <span style={{ fontSize: "0.6875rem", color: "var(--ink3)" }}>
          Fuente: IPC nivel general (INDEC) · {result.months_elapsed} meses
        </span>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--ink3)" }}>
            Valor equivalente en {monthLabel(toMonth)}
          </div>
          <div className="num" style={{ fontSize: "var(--fs-num-xl)", fontWeight: 600, lineHeight: 1.1 }}>
            {formatMoneyAR(Number.parseFloat(result.adjusted_amount))}
          </div>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--ink2)", margin: 0 }}>
          {formatMoneyAR(Number.parseFloat(result.original_amount))} de {monthLabel(fromMonth)} equivalen a{" "}
          {formatMoneyAR(Number.parseFloat(result.adjusted_amount))} de {monthLabel(toMonth)}.
        </p>
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--ink3)" }}>Inflación acumulada del período</div>
          <div className="num" style={{ fontWeight: 600, color: "var(--neg)" }}>
            {formatNumberAR(Number.parseFloat(result.cumulative_inflation), 1)}%
          </div>
        </div>
      </div>
    </Card>
  );
}

function InflationEmptyCard({ isError }: Readonly<{ isError: boolean }>): ReactElement {
  return (
    <Card>
      <p
        style={{
          color: "var(--ink3)",
          fontSize: "0.875rem",
          margin: 0,
          textAlign: "center",
          padding: "40px 0",
        }}
      >
        {isError
          ? "No se pudo calcular. Revisá las fechas (debe haber IPC publicado para el rango)."
          : "Elegí un monto y un rango de meses."}
      </p>
    </Card>
  );
}

export default function InflationAdjustmentPage(): ReactElement {
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [fromMonth, setFromMonth] = useState("2023-01");
  const [toMonth, setToMonth] = useState("2025-12");

  const mutation = useMutation({
    mutationFn: (body: InflationAdjustmentRequest) => calculatorsApi.inflationAdjustment(body),
  });

  const onSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    mutation.mutate({
      amount,
      from_date: `${fromMonth}-01`,
      to_date: `${toMonth}-01`,
    });
  };

  const result = mutation.data;

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: "48px 24px 72px",
        display: "flex",
        flexDirection: "column",
        gap: "var(--sp-6)",
      }}
    >
      <CalculatorHeader
        title="Ajuste por inflación"
        subtitle="Cuánto vale hoy un monto de otra fecha, según el IPC del INDEC."
      />

      <div
        style={{
          display: "grid",
          gap: "var(--sp-4)",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          alignItems: "start",
        }}
      >
        <Card title="Parámetros">
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Monto (ARS)</span>
              <input
                type="number"
                min={0}
                value={amount}
                onChange={(event) => {
                  setAmount(Number(event.target.value));
                }}
                style={inputStyle}
              />
            </label>
            <div style={{ display: "flex", gap: 12 }}>
              <label style={{ ...fieldStyle, flex: 1 }}>
                <span style={labelStyle}>Desde</span>
                <input
                  type="month"
                  value={fromMonth}
                  max={toMonth}
                  onChange={(event) => {
                    setFromMonth(event.target.value);
                  }}
                  style={inputStyle}
                />
              </label>
              <label style={{ ...fieldStyle, flex: 1 }}>
                <span style={labelStyle}>Hasta</span>
                <input
                  type="month"
                  value={toMonth}
                  min={fromMonth}
                  onChange={(event) => {
                    setToMonth(event.target.value);
                  }}
                  style={inputStyle}
                />
              </label>
            </div>
            <Button variant="primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Calculando…" : "Actualizar valor"}
            </Button>
          </form>
        </Card>

        {result ? (
          <InflationResultCard result={result} fromMonth={fromMonth} toMonth={toMonth} />
        ) : (
          <InflationEmptyCard isError={mutation.isError} />
        )}
      </div>
    </div>
  );
}
