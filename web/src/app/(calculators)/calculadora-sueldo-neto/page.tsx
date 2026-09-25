"use client";

import { CalculatorHeader } from "@/components/calculators/CalculatorHeader";
import { Button, Card, DataTable } from "@/components/core";
import { isTaxScaleOutdated } from "@/lib/freshness";
import { formatDateAR, formatMoneyAR, formatNumberAR } from "@/lib/indicators";
import { calculatorsApi } from "@/lib/labrechaApi";
import type { IncomeTaxRequest, IncomeTaxScaleInfo } from "@/lib/labrechaApi";
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

const OUTDATED_SCALE_WARNING =
  "Esta escala tiene más de 6 meses: ARCA la actualiza cada semestre, así que puede haber una " +
  "versión posterior. Verificá contra ARCA antes de usar el número.";

const DEDUCTION_LABELS: { key: string; label: string }[] = [
  { key: "retirement", label: "Jubilación (11%)" },
  { key: "health_insurance", label: "Obra social (3%)" },
  { key: "law_19032", label: "Ley 19.032 (3%)" },
  { key: "union_dues", label: "Sindicato" },
  { key: "income_tax", label: "Impuesto a las Ganancias" },
  { key: "total", label: "Total descuentos" },
];

function ScaleAttribution({ scale }: { scale: IncomeTaxScaleInfo }) {
  const outdated = isTaxScaleOutdated(scale.effective_from);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: "0.6875rem", color: "var(--ink3)" }}>
        Cálculo estimativo con la escala y las deducciones de Ganancias del período{" "}
        <b>{scale.period_label}</b> (vigentes desde {formatDateAR(scale.effective_from)}). Fuente:{" "}
        <a href={scale.source_url} target="_blank" rel="noreferrer" style={{ color: "var(--ink2)" }}>
          {scale.source}
        </a>
      </span>
      {outdated && (
        <span style={{ fontSize: "0.6875rem", color: "var(--gap)", fontWeight: 600 }}>
          {OUTDATED_SCALE_WARNING}
        </span>
      )}
    </div>
  );
}

export default function IncomeTaxPage() {
  const [grossSalary, setGrossSalary] = useState(2000000);
  const [hasSpouse, setHasSpouse] = useState(false);
  const [children, setChildren] = useState(0);
  const [housingRent, setHousingRent] = useState(0);
  const [retired, setRetired] = useState(false);

  const mutation = useMutation({
    mutationFn: (body: IncomeTaxRequest) => calculatorsApi.incomeTax(body),
  });

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate({
      gross_monthly_salary: grossSalary,
      has_spouse: hasSpouse,
      number_of_children: children,
      housing_rent: housingRent || undefined,
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
        title="Calculadora de sueldo neto"
        subtitle="Estimá tu sueldo de bolsillo con las deducciones de ley y el Impuesto a las Ganancias."
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
            <div style={{ display: "flex", gap: 12 }}>
              <label style={{ ...fieldStyle, flex: 1 }}>
                <span style={labelStyle}>Hijos a cargo</span>
                <input
                  type="number"
                  min={0}
                  value={children}
                  onChange={(event) => setChildren(Number(event.target.value))}
                  style={inputStyle}
                />
              </label>
              <label style={{ ...fieldStyle, flex: 1 }}>
                <span style={labelStyle}>Alquiler mensual (ARS)</span>
                <input
                  type="number"
                  min={0}
                  value={housingRent}
                  onChange={(event) => setHousingRent(Number(event.target.value))}
                  style={inputStyle}
                />
              </label>
            </div>
            <label style={checkboxRow}>
              <input
                type="checkbox"
                checked={hasSpouse}
                onChange={(event) => setHasSpouse(event.target.checked)}
              />
              Cónyuge a cargo
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
              {mutation.isPending ? "Calculando…" : "Calcular sueldo neto"}
            </Button>
          </form>
        </Card>

        {result ? (
          <Card title="Tu sueldo de bolsillo" footer={<ScaleAttribution scale={result.scale} />}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--ink3)" }}>Neto mensual</div>
                <div
                  className="num"
                  style={{ fontSize: "var(--fs-num-xl)", fontWeight: 600, lineHeight: 1.1 }}
                >
                  {formatMoneyAR(Number.parseFloat(result.net_monthly_salary))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ink3)" }}>Ganancias mensual</div>
                  <div className="num" style={{ fontWeight: 600, color: "var(--neg)" }}>
                    {formatMoneyAR(Number.parseFloat(result.monthly_tax))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ink3)" }}>Alícuota efectiva</div>
                  <div className="num" style={{ fontWeight: 600 }}>
                    {formatNumberAR(Number.parseFloat(result.effective_rate), 1)}%
                  </div>
                </div>
              </div>
              <DataTable
                columns={[
                  { key: "concepto", label: "Descuento" },
                  { key: "monto", label: "Mensual", align: "right", numeric: true },
                ]}
                rows={DEDUCTION_LABELS.filter((item) => result.deduction_breakdown[item.key]).map((item) => ({
                  id: item.key,
                  cells: [
                    item.label,
                    formatMoneyAR(Number.parseFloat(result.deduction_breakdown[item.key] ?? "0")),
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
