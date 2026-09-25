"use client";
import type { ReactElement } from "react";

const MONO = "var(--font-jb-mono)";

const TOPIC_LABELS: Record<string, string> = {
  economia: "Economía",
  impuestos: "Impuestos",
  laboral: "Laboral",
  salud: "Salud",
  educacion: "Educación",
  seguridad: "Seguridad",
  justicia: "Justicia",
  institucional: "Institucional",
  derechos: "Derechos",
  ambiente: "Ambiente",
  internacional: "Internacional",
  otro: "Otro",
};

export function TopicChip({ topic }: Readonly<{ topic: string }>): ReactElement {
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: "0.62rem",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--ink2)",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        padding: "2px 8px",
        borderRadius: "var(--radius-pill)",
      }}
    >
      {TOPIC_LABELS[topic] ?? topic}
    </span>
  );
}

interface VoteSummaryProps {
  summary: string;
  showAttribution?: boolean;
}

export function VoteSummary({ summary, showAttribution = false }: Readonly<VoteSummaryProps>): ReactElement {
  return (
    <div style={{ borderLeft: "2px solid var(--line2)", paddingLeft: 14, margin: "0 0 22px" }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: "0.62rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink3)",
          marginBottom: 6,
        }}
      >
        Qué se votó
      </div>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "1.0625rem",
          lineHeight: 1.5,
          color: "var(--ink2)",
          margin: 0,
        }}
      >
        {summary}
      </p>
      {showAttribution ? (
        <p
          style={{
            fontFamily: MONO,
            fontSize: "0.62rem",
            lineHeight: 1.5,
            color: "var(--ink3)",
            margin: "8px 0 0",
          }}
        >
          Resumen generado con IA a partir de los títulos oficiales de los expedientes (HCDN).
        </p>
      ) : null}
    </div>
  );
}
