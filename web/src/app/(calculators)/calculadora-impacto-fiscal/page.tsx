"use client";

import { CalculatorHeader } from "@/components/calculators/CalculatorHeader";
import { Button, Card, DataTable } from "@/components/core";
import { formatMoneyAR, formatNumberAR } from "@/lib/indicators";
import { calculatorsApi } from "@/lib/labrechaApi";
import type { TaxImpactRequest } from "@/lib/labrechaApi";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

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
const checkboxRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: "0.875rem",
  color: "var(--ink)",
};

function formatFreedomDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) {
    return isoDate;
  }
  return new Date(year, month - 1, day).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
  });
}

export default function TaxImpactPage() {
  const [grossSalary, setGrossSalary] = useState(2000000);
  const [monthlyExpenses, setMonthlyExpenses] = useState(1200000);
  const [retired, setRetired] = useState(false);

  const mutation = useMutation({
    mutationFn: (body: TaxImpactRequest) => calculatorsApi.taxImpact(body),
  });

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate({
      gross_monthly_salary: grossSalary,
      monthly_expenses: monthlyExpenses,
      retired,
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
        title="Tu impacto fiscal"
        subtitle="Cuánto de tu ingreso se va en impuestos y aportes, y hasta qué día del año trabajás para el Estado antes de empezar a ganar para vos."
      />

      <div
        style={{
          display: "grid",
          gap: "var(--sp-4)",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          alignItems: "start",
        }}
      >
        <Card title="Tu situación">
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Sueldo bruto mensual (ARS)</span>
              <input
                type="number"
                min={0}
                value={grossSalary}
                onChange={(event) => setGrossSalary(Number(event.target.value))}
                style={inputStyle}
              />
            </label>
            <label style={fieldStyle}>
              <span style={labelStyle}>Gastos mensuales promedio (ARS)</span>
              <input
                type="number"
                min={0}
                value={monthlyExpenses}
                onChange={(event) => setMonthlyExpenses(Number(event.target.value))}
                style={inputStyle}
              />
            </label>
            <label style={checkboxRow}>
              <input
                type="checkbox"
                checked={retired}
                onChange={(event) => setRetired(event.target.checked)}
              />
              Soy jubilado / pensionado
            </label>
            <Button variant="primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Calculando…" : "Calcular impacto fiscal"}
            </Button>
          </form>
        </Card>

        {result ? (
          <Card
            title="Cuánto le dejás al Estado"
            footer={
              <span style={{ fontSize: "0.6875rem", color: "var(--ink3)" }}>
                Estimación. El IVA se calcula al 21% embebido en tus gastos y los Ingresos Brutos a una
                alícuota provincial representativa del 4%; los aportes de la seguridad social financian tu
                jubilación y obra social. No incluye impuestos internos ni tasas municipales.
              </span>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 16,
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--gap-bg)",
                  color: "var(--gap)",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600 }}>Trabajás para el Estado hasta el</div>
                  <div className="num" style={{ fontSize: "1.5rem", fontWeight: 600, lineHeight: 1.1 }}>
                    {formatFreedomDate(result.tax_freedom_date)}
                  </div>
                  <div style={{ fontSize: "0.6875rem" }}>{result.days_for_the_state} días del año</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600 }}>Presión total</div>
                  <div className="num" style={{ fontSize: "1.5rem", fontWeight: 600, lineHeight: 1.1 }}>
                    {formatNumberAR(Number.parseFloat(result.total_pressure), 1)}%
                  </div>
                  <div style={{ fontSize: "0.6875rem" }}>
                    {formatMoneyAR(Number.parseFloat(result.total_monthly))} por mes
                  </div>
                </div>
              </div>
              <DataTable
                columns={[
                  { key: "concepto", label: "Concepto" },
                  { key: "mensual", label: "Mensual", align: "right", numeric: true },
                  { key: "anual", label: "Anual", align: "right", numeric: true },
                  { key: "share", label: "% ingreso", align: "right", numeric: true },
                ]}
                rows={result.items.map((item) => ({
                  id: item.concept,
                  cells: [
                    item.concept,
                    formatMoneyAR(Number.parseFloat(item.monthly_amount)),
                    formatMoneyAR(Number.parseFloat(item.annual_amount)),
                    `${formatNumberAR(Number.parseFloat(item.share_of_income), 1)}%`,
                  ],
                }))}
              />
            </div>
          </Card>
        ) : (
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
              {mutation.isError
                ? "No se pudo calcular. Revisá los valores ingresados."
                : "Completá tu situación y presioná Calcular."}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
