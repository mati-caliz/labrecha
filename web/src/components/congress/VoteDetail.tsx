"use client";
import type { ReactElement } from "react";

import {
  BlocRow,
  type Tally,
  TallyBar,
  TallyCounts,
  tallyOf,
  VoteLegend,
} from "@/components/congress/VoteBars";
import { TopicChip, VoteSummary } from "@/components/congress/VoteSummary";
import { Skeleton } from "@/components/ui/skeleton";
import { useCongressVote, useCongressVoteDetails } from "@/hooks/useLabrecha";
import { chamberLabel, chamberMemberLabel } from "@/lib/chambers";
import { type BlocVoteTally, normalizeResult, tallyByBloc } from "@/lib/congress";
import type { CongressVote } from "@/lib/labrechaApi";
import { formatDateAR } from "@/lib/indicators";
import Link from "next/link";
import { hasText } from "@/lib/utils";

const MONO = "var(--font-jb-mono)";

interface VoteDetailProps {
  voteRecordId: string;
}

const APPROVED_CHIP = { label: "Aprobado", color: "var(--pos)", background: "var(--pos-bg)" };
const REJECTED_CHIP = { label: "Rechazado", color: "var(--neg)", background: "var(--neg-bg)" };

function VoteMetaLine({ vote }: Readonly<{ vote: CongressVote }>): ReactElement {
  return (
    <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--ink3)" }}>
      {chamberLabel(vote.chamber)} · {hasText(vote.date) ? formatDateAR(vote.date) : "s/f"}
      {hasText(vote.session_type) ? ` · sesión ${vote.session_type.toLowerCase()}` : ""}
      {hasText(vote.vote_type) ? ` · ${vote.vote_type.toLowerCase()}` : ""}
      {hasText(vote.president_name) ? ` · preside ${vote.president_name}` : ""}
    </span>
  );
}

function VoteHeaderCard({ vote, tally }: Readonly<{ vote: CongressVote; tally: Tally }>): ReactElement {
  const chip = normalizeResult(vote.result).won ? APPROVED_CHIP : REJECTED_CHIP;
  return (
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
        <VoteMetaLine vote={vote} />
        {hasText(vote.topic) ? <TopicChip topic={vote.topic} /> : null}
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
      {hasText(vote.summary) ? <VoteSummary summary={vote.summary} showAttribution /> : null}
      <div style={{ marginBottom: 8 }}>
        <TallyBar tally={tally} />
      </div>
      <TallyCounts tally={tally} />
    </div>
  );
}

function BlocBreakdownBody({
  blocs,
  chamber,
  loadingDetails,
}: Readonly<{
  blocs: BlocVoteTally[];
  chamber: CongressVote["chamber"];
  loadingDetails: boolean;
}>): ReactElement {
  if (loadingDetails) {
    return <Skeleton className="h-40 w-full rounded-[6px]" />;
  }
  if (blocs.length === 0) {
    return (
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "0.9rem",
          color: "var(--ink2)",
          margin: 0,
        }}
      >
        No hay detalle de voto por {chamberMemberLabel(chamber)} para esta votación.
      </p>
    );
  }
  return (
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
  );
}

export function VoteDetail({ voteRecordId }: Readonly<VoteDetailProps>): ReactElement {
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

  const tally = tallyOf(vote);
  const blocs = tallyByBloc(details ?? []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 72px" }}>
      <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--ink3)", marginBottom: 22 }}>
        <Link href="/congreso" style={{ color: "var(--ink3)", textDecoration: "none" }}>
          Congreso
        </Link>{" "}
        / <span style={{ color: "var(--ink2)" }}>Votación</span>
      </div>

      <VoteHeaderCard vote={vote} tally={tally} />

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
        <BlocBreakdownBody blocs={blocs} chamber={vote.chamber} loadingDetails={loadingDetails} />
      </div>
    </div>
  );
}
