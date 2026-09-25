"use client";
import type { ReactElement } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useCongressVote, useIndicatorVariation } from "@/hooks/useLabrecha";
import { formatDateAR, formatNumberAR, getIndicatorDisplay } from "@/lib/indicators";
import type { IndicatorDisplay } from "@/lib/indicatorCatalog";
import type { CongressVote, IndicatorVariation } from "@/lib/labrechaApi";
import type { VoteOutcome } from "@/lib/voteOutcomes";
import { VOTE_OUTCOMES } from "@/lib/voteOutcomes";
import Link from "next/link";

const MONO = "var(--font-jb-mono)";
const CHANGE_DECIMALS = 1;

const CAUSALITY_NOTE =
  "Que el indicador se haya movido después de la votación no significa que la votación lo haya causado: son dos series puestas en la misma línea de tiempo, no una explicación.";

function formatChange(change: number): string {
  const sign = change > 0 ? "+" : "";
  return `${sign}${formatNumberAR(change, CHANGE_DECIMALS)} %`;
}

function changeColor(change: number, goodWhen: "up" | "down" | "neutral"): string {
  if (change === 0 || goodWhen === "neutral") {
    return "var(--ink2)";
  }
  const good = goodWhen === "up" ? change > 0 : change < 0;
  return good ? "var(--pos)" : "var(--neg)";
}

function VoteHeadline({
  vote,
  voteDate,
  voteRecordId,
}: Readonly<{ vote: CongressVote; voteDate: string; voteRecordId: string }>): ReactElement {
  const summary = (vote.summary ?? "").trim();
  const officialTitle = (vote.title ?? "").trim();
  const headline = summary.length > 0 ? summary : officialTitle || voteRecordId;
  return (
    <div style={{ flex: "1 1 280px" }}>
      <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--ink3)" }}>
        Votación del {formatDateAR(voteDate)} · {vote.result ?? "sin resultado"} ·{" "}
        {vote.affirmative_votes ?? 0} a favor / {vote.negative_votes ?? 0} en contra
      </div>
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "1.0625rem",
          letterSpacing: "-0.015em",
          margin: "6px 0 0",
          color: "var(--ink)",
        }}
      >
        {headline}
      </h3>
      {summary.length > 0 ? (
        <div style={{ fontFamily: MONO, fontSize: "0.6rem", color: "var(--ink3)", marginTop: 6 }}>
          Resumen generado por IA · título oficial: {officialTitle || "—"}
        </div>
      ) : null}
    </div>
  );
}

interface IndicatorChangeProps {
  indicator: IndicatorDisplay;
  variation: IndicatorVariation | undefined;
  isLoading: boolean;
}

function IndicatorChangeValue({
  indicator,
  variation,
  isLoading,
}: Readonly<IndicatorChangeProps>): ReactElement {
  if (isLoading) {
    return <Skeleton className="mt-2 h-[34px] w-[110px] rounded-[6px]" />;
  }
  if (variation === undefined) {
    return (
      <div style={{ fontFamily: MONO, fontSize: "0.8rem", color: "var(--ink3)", marginTop: 6 }}>
        sin serie suficiente
      </div>
    );
  }
  const change = Number.parseFloat(variation.change_pct);
  return (
    <>
      <div
        className="num"
        style={{
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: "1.75rem",
          lineHeight: 1.1,
          color: changeColor(change, indicator.goodWhen),
        }}
      >
        {formatChange(change)}
      </div>
      <div style={{ fontFamily: MONO, fontSize: "0.6rem", color: "var(--ink3)" }}>
        {indicator.format(Number.parseFloat(variation.first_value))} →{" "}
        {indicator.format(Number.parseFloat(variation.last_value))} · al {formatDateAR(variation.last_date)}
      </div>
    </>
  );
}

function OutcomeCard({ outcome }: Readonly<{ outcome: VoteOutcome }>): ReactElement | null {
  const indicator = getIndicatorDisplay(outcome.indicatorCode);
  const vote = useCongressVote(outcome.voteRecordId);
  const voteDate = vote.data?.date ?? "";
  const variation = useIndicatorVariation(
    outcome.indicatorCode,
    { date_from: voteDate },
    voteDate.length > 0,
  );

  if (vote.isLoading) {
    return <Skeleton className="h-[180px] w-full rounded-[10px]" />;
  }
  if (vote.data === undefined || voteDate.length === 0) {
    return null;
  }

  return (
    <article
      style={{
        background: "var(--raise)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "22px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        <VoteHeadline vote={vote.data} voteDate={voteDate} voteRecordId={outcome.voteRecordId} />

        <div style={{ textAlign: "right", minWidth: 150 }}>
          <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--ink3)" }}>
            {indicator.label} desde entonces
          </div>
          <IndicatorChangeValue
            indicator={indicator}
            variation={variation.data}
            isLoading={variation.isLoading}
          />
        </div>
      </div>

      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "0.9375rem",
          lineHeight: 1.6,
          color: "var(--ink2)",
          margin: 0,
        }}
      >
        {outcome.reading}
      </p>

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <Link
          href={`/congreso/votacion/${outcome.voteRecordId}`}
          style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--ink2)" }}
        >
          Ver quién votó qué →
        </Link>
        <Link href={indicator.href} style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--ink2)" }}>
          Ver la serie de {indicator.label} →
        </Link>
      </div>
    </article>
  );
}

export function VotedVsHappened(): ReactElement | null {
  if (VOTE_OUTCOMES.length === 0) {
    return null;
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: "0.66rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--gap)",
            marginBottom: 8,
          }}
        >
          ◆ Lo votado y lo que pasó
        </div>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "0.9375rem",
            lineHeight: 1.6,
            color: "var(--ink2)",
            margin: 0,
            maxWidth: 640,
          }}
        >
          Un puñado de votaciones elegidas a mano, cruzadas con el indicador que la norma tocaba.{" "}
          {CAUSALITY_NOTE}
        </p>
      </div>

      {VOTE_OUTCOMES.map((outcome) => (
        <OutcomeCard key={`${outcome.voteRecordId}-${outcome.indicatorCode}`} outcome={outcome} />
      ))}
    </section>
  );
}
