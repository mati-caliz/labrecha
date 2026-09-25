"use client";
import type { ReactElement } from "react";

import { Badge } from "@/components/core";
import { Skeleton } from "@/components/ui/skeleton";
import { useCongressLaws } from "@/hooks/useLabrecha";
import { formatDateAR } from "@/lib/indicators";
import type { SanctionedLaw } from "@/lib/labrechaApi";
import { hasText } from "@/lib/utils";

interface TimelineStep {
  label: string;
  date: string | null;
}

function buildSteps(law: SanctionedLaw): TimelineStep[] {
  const steps: TimelineStep[] = [{ label: "1ª media sanción", date: law.first_half_sanction }];
  if (hasText(law.second_half_sanction)) {
    steps.push({ label: "2ª media sanción", date: law.second_half_sanction });
  }
  steps.push({ label: "Sanción definitiva", date: law.final_sanction });
  return steps;
}

function LawCard({ law }: Readonly<{ law: SanctionedLaw }>): ReactElement {
  const steps = buildSteps(law);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "16px 18px",
        background: "var(--raise)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Badge tone="accent">Ley {law.law_number}</Badge>
        {hasText(law.sanctioning_chamber) && (
          <span style={{ fontSize: "0.6875rem", color: "var(--ink3)" }}>
            Sancionada en {law.sanctioning_chamber}
          </span>
        )}
      </div>

      <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--ink)", lineHeight: 1.35 }}>
        {law.title ?? `Ley ${law.law_number}`}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
        {steps.map((step, index) => {
          const reached = step.date !== null;
          return (
            <div key={step.label} style={{ display: "flex", alignItems: "center" }}>
              {index > 0 && (
                <span
                  style={{
                    width: 22,
                    height: 2,
                    background: reached ? "var(--pos)" : "var(--line2)",
                    margin: "0 6px",
                  }}
                />
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 999,
                      background: reached ? "var(--pos)" : "var(--line2)",
                    }}
                  />
                  <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--ink2)" }}>
                    {step.label}
                  </span>
                </span>
                <span className="num" style={{ fontSize: "0.6875rem", color: "var(--ink3)", marginLeft: 15 }}>
                  {hasText(step.date) ? formatDateAR(step.date) : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: "0.625rem", color: "var(--ink3)" }}>
        Expediente {law.initial_file ?? "s/d"} · Fuente: HCDN (datos abiertos)
      </div>
    </div>
  );
}

export function RecentLaws(): ReactElement {
  const { data, isLoading } = useCongressLaws({ limit: 8 });

  if (isLoading) {
    return (
      <div
        style={{
          display: "grid",
          gap: "var(--sp-4)",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        }}
      >
        <Skeleton className="h-40 rounded-[10px]" />
        <Skeleton className="h-40 rounded-[10px]" />
        <Skeleton className="h-40 rounded-[10px]" />
      </div>
    );
  }

  const laws = data ?? [];
  if (laws.length === 0) {
    return <p style={{ color: "var(--ink3)", fontSize: "0.875rem" }}>No hay leyes para mostrar.</p>;
  }

  return (
    <div
      style={{
        display: "grid",
        gap: "var(--sp-4)",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      }}
    >
      {laws.map((law) => (
        <LawCard key={law.law_number} law={law} />
      ))}
    </div>
  );
}
