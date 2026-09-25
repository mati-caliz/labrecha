"use client";

import { BlocRow, TallyBar, TallyCounts, VoteLegend } from "@/components/congress/VoteBars";
import { TopicChip, VoteSummary } from "@/components/congress/VoteSummary";
import { Skeleton } from "@/components/ui/skeleton";
import { useCongressVoteDetails, useCongressVotes } from "@/hooks/useLabrecha";
import { type Chamber, chamberLabel, chamberMemberLabel, chamberSourceLabel } from "@/lib/chambers";
import { normalizeResult, tallyByBloc } from "@/lib/congress";
import { formatDateAR } from "@/lib/indicators";
import type { CongressVote } from "@/lib/labrechaApi";
import Link from "next/link";
import type { CSSProperties } from "react";

const MONO = "var(--font-jb-mono)";
const MAX_BLOCS = 6;

function resultChip(vote: CongressVote): { label: string; color: string; background: string } {
  const { won } = normalizeResult(vote.result);
  return won
    ? { label: "Aprobado", color: "var(--pos)", background: "var(--pos-bg)" }
    : { label: "Rechazado", color: "var(--neg)", background: "var(--neg-bg)" };
}

function ChamberChip({ chamber }: { chamber: Chamber }) {
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: "0.62rem",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--ink2)",
        border: "1px solid var(--line)",
        padding: "2px 8px",
        borderRadius: "var(--radius-pill)",
      }}
    >
      {chamberLabel(chamber)}
    </span>
  );
}

function tallyOf(vote: CongressVote) {
  return {
    afirmativos: vote.affirmative_votes ?? 0,
    negativos: vote.negative_votes ?? 0,
    abstenciones: vote.abstentions ?? 0,
    ausentes: vote.absents ?? 0,
  };
}

function FeaturedFicha({ vote }: { vote: CongressVote }) {
  const { data: details, isLoading } = useCongressVoteDetails(vote.vote_record_id);
  const chip = resultChip(vote);
  const blocs = tallyByBloc(details ?? []).slice(0, MAX_BLOCS);

  return (
    <div
      style={{
        background: "var(--raise)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: "28px 30px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: "0.68rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: chip.color,
            background: chip.background,
            border: `1px solid ${chip.color}`,
            padding: "4px 11px",
            borderRadius: "var(--radius-pill)",
          }}
        >
          {chip.label}
        </span>
        <ChamberChip chamber={vote.chamber} />
        <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--ink3)" }}>
          {vote.date ? formatDateAR(vote.date) : "s/f"}
          {vote.vote_record_id ? ` · Acta ${vote.vote_record_id}` : ""}
        </span>
        {vote.topic ? <TopicChip topic={vote.topic} /> : null}
      </div>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "clamp(1.5rem, 3.5vw, 1.875rem)",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          margin: "0 0 22px",
          color: "var(--ink)",
        }}
      >
        {vote.title ?? "Votación sin título"}
      </h2>
      {vote.summary ? <VoteSummary summary={vote.summary} /> : null}

      <div style={{ marginBottom: 8 }}>
        <TallyBar tally={tallyOf(vote)} />
      </div>
      <div style={{ marginBottom: 26 }}>
        <TallyCounts tally={tallyOf(vote)} />
      </div>

      <div
        style={{
          fontFamily: MONO,
          fontSize: "0.68rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink3)",
          marginBottom: 16,
        }}
      >
        Por bloque
      </div>
      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-[6px]" />
      ) : blocs.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "0.9rem",
            color: "var(--ink2)",
            margin: 0,
          }}
        >
          No hay detalle de voto por {chamberMemberLabel(vote.chamber)} para esta votación.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {blocs.map((bloc) => (
            <BlocRow key={bloc.bloc} tally={bloc} />
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid var(--line)",
          flexWrap: "wrap",
        }}
      >
        <VoteLegend />
        <span
          style={{
            marginLeft: "auto",
            fontFamily: MONO,
            fontSize: "0.66rem",
            color: "var(--ink3)",
          }}
        >
          Fuente: {chamberSourceLabel(vote.chamber)}
          {vote.date ? ` · ${formatDateAR(vote.date)}` : ""}
        </span>
      </div>
    </div>
  );
}

function RecentItem({ vote, style }: { vote: CongressVote; style: CSSProperties }) {
  const chip = resultChip(vote);
  return (
    <Link
      href={`/congreso/votacion/${vote.vote_record_id}`}
      style={{
        display: "block",
        background: "var(--raise)",
        border: "1px solid var(--line)",
        padding: "16px 18px",
        textDecoration: "none",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: "0.62rem",
            fontWeight: 700,
            textTransform: "uppercase",
            color: chip.color,
            background: chip.background,
            padding: "2px 8px",
            borderRadius: "var(--radius-pill)",
          }}
        >
          {chip.label}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: MONO,
            fontSize: "0.66rem",
            color: "var(--ink3)",
          }}
        >
          <ChamberChip chamber={vote.chamber} />
          {vote.topic ? <TopicChip topic={vote.topic} /> : null}
          {vote.date ? formatDateAR(vote.date) : "s/f"}
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "1.0625rem",
          lineHeight: 1.15,
          letterSpacing: "-0.01em",
          marginBottom: 8,
          color: "var(--ink)",
        }}
      >
        {vote.title ?? "Votación sin título"}
      </div>
      {vote.summary ? (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "0.9375rem",
            lineHeight: 1.45,
            color: "var(--ink2)",
            margin: "0 0 8px",
          }}
        >
          {vote.summary}
        </p>
      ) : null}
      <div style={{ fontFamily: MONO, fontSize: "0.7rem", color: "var(--ink3)" }}>
        {vote.affirmative_votes ?? "—"} · {vote.negative_votes ?? "—"} · {vote.abstentions ?? "—"}
      </div>
    </Link>
  );
}

export function VotesBoard() {
  const { data, isLoading } = useCongressVotes({ limit: 8 });
  const votes = data ?? [];

  if (isLoading) {
    return (
      <div className="lb-congress-grid" style={{ gap: 32 }}>
        <Skeleton className="h-[520px] rounded-[12px]" />
        <Skeleton className="h-[520px] rounded-[12px]" />
      </div>
    );
  }

  const featured = votes[0];
  if (!featured) {
    return (
      <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink2)" }}>No hay votaciones para mostrar.</p>
    );
  }

  const recent = votes.slice(1, 6);

  return (
    <div className="lb-congress-grid" style={{ gap: 32 }}>
      <FeaturedFicha vote={featured} />
      <div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: "0.68rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink3)",
            marginBottom: 16,
          }}
        >
          Votaciones recientes
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {recent.map((vote, index) => (
            <RecentItem
              key={vote.vote_record_id}
              vote={vote}
              style={{
                borderTop: index === 0 ? "1px solid var(--line)" : "none",
                borderRadius:
                  recent.length === 1
                    ? "9px"
                    : index === 0
                      ? "9px 9px 0 0"
                      : index === recent.length - 1
                        ? "0 0 9px 9px"
                        : "0",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
