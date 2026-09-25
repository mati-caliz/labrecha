import type { ReactElement } from "react";
import type { BlocVoteTally } from "@/lib/congress";
import type { CongressVote } from "@/lib/labrechaApi";

const MONO = "var(--font-jb-mono)";
const PERCENT = 100;

export const VOTE_COLORS = {
  afirmativos: "var(--pos)",
  negativos: "var(--neg)",
  abstenciones: "var(--ink3)",
  ausentes: "var(--line2)",
} as const;

export interface Tally {
  afirmativos: number;
  negativos: number;
  abstenciones: number;
  ausentes: number;
}

export function tallyOf(vote: CongressVote): Tally {
  return {
    afirmativos: vote.affirmative_votes ?? 0,
    negativos: vote.negative_votes ?? 0,
    abstenciones: vote.abstentions ?? 0,
    ausentes: vote.absents ?? 0,
  };
}

function segments(tally: Tally): { key: keyof Tally; value: number; color: string }[] {
  return [
    { key: "afirmativos", value: tally.afirmativos, color: VOTE_COLORS.afirmativos },
    { key: "negativos", value: tally.negativos, color: VOTE_COLORS.negativos },
    { key: "abstenciones", value: tally.abstenciones, color: VOTE_COLORS.abstenciones },
    { key: "ausentes", value: tally.ausentes, color: VOTE_COLORS.ausentes },
  ];
}

export function TallyBar({ tally, height = 16 }: Readonly<{ tally: Tally; height?: number }>): ReactElement {
  const castTotal = tally.afirmativos + tally.negativos + tally.abstenciones + tally.ausentes;
  const total = castTotal === 0 ? 1 : castTotal;
  return (
    <div
      style={{
        display: "flex",
        height,
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--line2)",
      }}
    >
      {segments(tally).map((segment) =>
        segment.value > 0 ? (
          <div
            key={segment.key}
            style={{ width: `${(segment.value / total) * PERCENT}%`, background: segment.color }}
          />
        ) : null,
      )}
    </div>
  );
}

export function TallyCounts({ tally }: Readonly<{ tally: Tally }>): ReactElement {
  const items: { label: string; value: number; color: string }[] = [
    { label: "Afirmativos", value: tally.afirmativos, color: VOTE_COLORS.afirmativos },
    { label: "Negativos", value: tally.negativos, color: VOTE_COLORS.negativos },
    { label: "Abstenciones", value: tally.abstenciones, color: VOTE_COLORS.abstenciones },
  ];
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        fontFamily: MONO,
        fontSize: "0.75rem",
      }}
    >
      {items.map((item) => (
        <span key={item.label} style={{ color: item.color }}>
          {item.label} <b style={{ fontSize: "0.9375rem" }}>{item.value}</b>
        </span>
      ))}
    </div>
  );
}

export function BlocRow({ tally }: Readonly<{ tally: BlocVoteTally }>): ReactElement {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          fontFamily: MONO,
          fontSize: "0.78rem",
          marginBottom: 7,
        }}
      >
        <span style={{ color: "var(--ink)" }}>{tally.bloc}</span>
        <span style={{ color: "var(--ink3)" }}>{tally.total}</span>
      </div>
      <TallyBar tally={tally} height={10} />
    </div>
  );
}

export function VoteLegend(): ReactElement {
  const items: { label: string; color: string }[] = [
    { label: "Afirmativo", color: VOTE_COLORS.afirmativos },
    { label: "Negativo", color: VOTE_COLORS.negativos },
    { label: "Abstención", color: VOTE_COLORS.abstenciones },
    { label: "Ausente", color: VOTE_COLORS.ausentes },
  ];
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      {items.map((item) => (
        <span
          key={item.label}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: MONO,
            fontSize: "0.68rem",
            color: "var(--ink2)",
          }}
        >
          <span style={{ width: 11, height: 11, borderRadius: 3, background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
