"use client";

import { BlocRow, TallyBar, TallyCounts, VoteLegend } from "@/components/congress/VoteBars";
import { TopicChip, VoteSummary } from "@/components/congress/VoteSummary";
import { Skeleton } from "@/components/ui/skeleton";
import { useCongressVote, useCongressVoteDetails } from "@/hooks/useLabrecha";
import { chamberLabel, chamberMemberLabel } from "@/lib/chambers";
import { normalizeResult, tallyByBloc } from "@/lib/congress";
import { formatDateAR } from "@/lib/indicators";
import Link from "next/link";

const MONO = "var(--font-jb-mono)";

interface VoteDetailProps {
  voteRecordId: string;
}

export function VoteDetail({ voteRecordId }: VoteDetailProps) {
  const { data: vote, isLoading: loadingVote } = useCongressVote(voteRecordId);
  const { data: details, isLoading: loadingDetails } = useCongressVoteDetails(voteRecordId);

  if (loadingVote) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "44px 24px" }}>
        <Skeleton className="h-64 w-full rounded-[10px]" />
      </div>
    );
  }
  if (!vote) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "44px 24px" }}>
        <p style={{ fontFamily: "var(--font-serif)", color: "var(--ink2)" }}>
          No se encontró la votación solicitada.
        </p>
      </div>
    );
  }

  const result = normalizeResult(vote.result);
  const chip = result.won
    ? { label: "Aprobado", color: "var(--pos)", background: "var(--pos-bg)" }
    : { label: "Rechazado", color: "var(--neg)", background: "var(--neg-bg)" };
  const tally = {
    afirmativos: vote.affirmative_votes ?? 0,
    negativos: vote.negative_votes ?? 0,
    abstenciones: vote.abstentions ?? 0,
    ausentes: vote.absents ?? 0,
  };
  const blocs = tallyByBloc(details ?? []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 72px" }}>
      <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--ink3)", marginBottom: 22 }}>
        <Link href="/congreso" style={{ color: "var(--ink3)", textDecoration: "none" }}>
          Congreso
        </Link>{" "}
        / <span style={{ color: "var(--ink2)" }}>Votación</span>
      </div>

      <div
        style={{
          background: "var(--raise)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: "28px 30px",
          marginBottom: 24,
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
          <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--ink3)" }}>
            {chamberLabel(vote.chamber)} · {vote.date ? formatDateAR(vote.date) : "s/f"}
            {vote.session_type ? ` · sesión ${vote.session_type.toLowerCase()}` : ""}
            {vote.vote_type ? ` · ${vote.vote_type.toLowerCase()}` : ""}
            {vote.president_name ? ` · preside ${vote.president_name}` : ""}
          </span>
          {vote.topic ? <TopicChip topic={vote.topic} /> : null}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(1.75rem, 4vw, 2.375rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
            margin: "0 0 22px",
            color: "var(--ink)",
          }}
        >
          {vote.title ?? "Votación"}
        </h1>
        {vote.summary ? <VoteSummary summary={vote.summary} showAttribution /> : null}
        <div style={{ marginBottom: 8 }}>
          <TallyBar tally={tally} />
        </div>
        <TallyCounts tally={tally} />
      </div>

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
            fontFamily: MONO,
            fontSize: "0.68rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink3)",
            marginBottom: 4,
          }}
        >
          Voto por bloque
        </div>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "0.9rem",
            color: "var(--ink2)",
            margin: "0 0 20px",
          }}
        >
          Cómo votó cada bloque de la cámara.
        </p>
        {loadingDetails ? (
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
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {blocs.map((bloc) => (
                <BlocRow key={bloc.bloc} tally={bloc} />
              ))}
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <VoteLegend />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
