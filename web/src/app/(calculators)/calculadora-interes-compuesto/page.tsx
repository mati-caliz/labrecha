"use client";

import { CalculatorHeader } from "@/components/calculators/CalculatorHeader";
import { Button, Card, DataTable } from "@/components/core";
import { formatMoneyAR } from "@/lib/indicators";
import { calculatorsApi } from "@/lib/labrechaApi";
import type { CompoundInterestRequest, CompoundInterestResponse } from "@/lib/labrechaApi";
import { useMutation } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";

type CompoundingFrequency = CompoundInterestRequest["compounding_frequency"];

const DEFAULT_INITIAL_CAPITAL = 100000;
const DEFAULT_ANNUAL_RATE = 40;
const DEFAULT_YEARS = 5;

const FREQUENCIES: { value: CompoundingFrequency; label: string }[] = [
  { value: "MONTHLY", label: "Mensual" },
  { value: "QUARTERLY", label: "Trimestral" },
  { value: "YEARLY", label: "Anual" },
];

const fieldStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 4,
};

const inputStyle = {
  padding: "8px 10px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--line2)",
  background: "var(--raise)",
  color: "var(--ink)",
  fontFamily: "var(--font-jb-mono)",
  fontSize: "0.9375rem",
};

const labelStyle = {
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--ink2)",
};

function optionalContribution(contribution: number): number | undefined {
  if (contribution === 0 || Number.isNaN(contribution)) {
    return undefined;
  }
  return contribution;
}

interface CompoundingPeriodFieldsProps {
  years: number;
  frequency: CompoundingFrequency;
  onYearsChange: (years: number) => void;
  onFrequencyChange: (frequency: CompoundingFrequency) => void;
}

function CompoundingPeriodFields({
  years,
  frequency,
  onYearsChange,
  onFrequencyChange,
}: Readonly<CompoundingPeriodFieldsProps>): ReactElement {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <label style={{ ...fieldStyle, flex: 1 }}>
        <span style={labelStyle}>Años</span>
        <input
          type="number"
          min={1}
          value={years}
          onChange={(event) => {
            onYearsChange(Number(event.target.value));
          }}
          style={inputStyle}
        />
      </label>
      <label style={{ ...fieldStyle, flex: 1 }}>
        <span style={labelStyle}>Capitalización</span>
        <select
          value={frequency}
          onChange={(event) => {
            const selected = FREQUENCIES.find((option) => option.value === event.target.value);
            if (selected !== undefined) {
              onFrequencyChange(selected.value);
            }
          }}
          style={inputStyle}
        >
          {FREQUENCIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function CompoundInterestResultCard({
  result,
}: Readonly<{ result: CompoundInterestResponse }>): ReactElement {
  return (
    <Card title="Resultado">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--ink3)" }}>Monto final</div>
          <div className="num" style={{ fontSize: "var(--fs-num-xl)", fontWeight: 600, lineHeight: 1.1 }}>
            {formatMoneyAR(Number.parseFloat(result.final_amount))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--ink3)" }}>Aportado</div>
            <div className="num" style={{ fontWeight: 600 }}>
              {formatMoneyAR(Number.parseFloat(result.total_contributions))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--ink3)" }}>Interés ganado</div>
            <div className="num" style={{ fontWeight: 600, color: "var(--pos)" }}>
              {formatMoneyAR(Number.parseFloat(result.total_interest))}
            </div>
          </div>
        </div>
        <DataTable
          columns={[
            { key: "period", label: "Período", numeric: true },
            { key: "principal", label: "Capital", align: "right", numeric: true },
            { key: "interest", label: "Interés", align: "right", numeric: true },
            { key: "total", label: "Total", align: "right", numeric: true },
          ]}
          rows={result.periods.map((period) => ({
            id: String(period.period),
            cells: [
              period.period,
              formatMoneyAR(Number.parseFloat(period.principal)),
              formatMoneyAR(Number.parseFloat(period.interest)),
              formatMoneyAR(Number.parseFloat(period.total)),
            ],
          }))}
        />
      </div>
    </Card>
  );
}

function CompoundInterestEmptyCard({ isError }: Readonly<{ isError: boolean }>): ReactElement {
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
          ? "No se pudo calcular. Revisá los valores e intentá de nuevo."
          : "Completá los parámetros y presioná Calcular."}
      </p>
    </Card>
  );
}

export default function CompoundInterestCalculatorPage(): ReactElement {
  const [initialCapital, setInitialCapital] = useState(DEFAULT_INITIAL_CAPITAL);
  const [annualRate, setAnnualRate] = useState(DEFAULT_ANNUAL_RATE);
  const [years, setYears] = useState(DEFAULT_YEARS);
  const [frequency, setFrequency] = useState<CompoundingFrequency>("MONTHLY");
  const [contribution, setContribution] = useState(0);

  const mutation = useMutation({
    mutationFn: (body: CompoundInterestRequest) => calculatorsApi.compoundInterest(body),
  });

  const onSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    mutation.mutate({
      initial_capital: initialCapital,
      annual_rate: annualRate,
      years,
      compounding_frequency: frequency,
      periodic_contribution: optionalContribution(contribution),
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
        title="Calculadora de interés compuesto"
        subtitle="Proyectá cómo crece un capital con capitalización periódica y aportes."
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
              <span style={labelStyle}>Capital inicial (ARS)</span>
              <input
                type="number"
                min={0}
                value={initialCapital}
                onChange={(event) => {
                  setInitialCapital(Number(event.target.value));
                }}
                style={inputStyle}
              />
            </label>
            <label style={fieldStyle}>
              <span style={labelStyle}>Tasa nominal anual (%)</span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={annualRate}
                onChange={(event) => {
                  setAnnualRate(Number(event.target.value));
                }}
                style={inputStyle}
              />
            </label>
            <CompoundingPeriodFields
              years={years}
              frequency={frequency}
              onYearsChange={setYears}
              onFrequencyChange={setFrequency}
            />
            <label style={fieldStyle}>
              <span style={labelStyle}>Aporte por período (ARS, opcional)</span>
              <input
                type="number"
                min={0}
                value={contribution}
                onChange={(event) => {
                  setContribution(Number(event.target.value));
                }}
                style={inputStyle}
              />
            </label>
            <Button variant="primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Calculando…" : "Calcular"}
            </Button>
          </form>
        </Card>

        {result ? (
          <CompoundInterestResultCard result={result} />
        ) : (
          <CompoundInterestEmptyCard isError={mutation.isError} />
        )}
      </div>
    </div>
  );
}
