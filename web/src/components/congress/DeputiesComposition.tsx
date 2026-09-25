"use client";
import type { ReactElement } from "react";

import {
  BlocLegend,
  type HemicycleBloc,
  HemicycleChart,
  type HemicycleSeat,
} from "@/components/congress/HemicycleChart";
import { Card } from "@/components/core";
import { Skeleton } from "@/components/ui/skeleton";
import { useCongressVoteDetails, useCongressVotes } from "@/hooks/useLabrecha";
import {
  blocNameOrUnknown,
  blocRankLookup,
  majorityOf,
  rankBlocsBySeatCount,
} from "@/components/congress/hemicycleBlocs";
import type { CongressVoteDetail } from "@/lib/labrechaApi";
import { LATEST_VOTE_PARAMS } from "@/lib/queryParams";
import { formatDateAR } from "@/lib/indicators";
import { hasText } from "@/lib/utils";

function buildDeputySeats(
  details: readonly CongressVoteDetail[],
  blocs: readonly HemicycleBloc[],
): HemicycleSeat[] {
  const blocRank = blocRankLookup(blocs);
  return [...details]
    .sort((first, second) => {
      const byBloc = blocRank(first.bloc) - blocRank(second.bloc);
      if (byBloc !== 0) {
        return byBloc;
      }
      return (first.legislator_name ?? "").localeCompare(second.legislator_name ?? "");
    })
    .map((detail, index) => ({
      id: `${detail.legislator_name ?? "banca"}-${index}`,
      occupantName: detail.legislator_name ?? "Banca sin datos",
      bloc: blocNameOrUnknown(detail.bloc),
      detailLines: [detail.district].filter((line): line is string => line !== null && line !== ""),
    }));
}

function DeputiesFooter({ voteDate }: Readonly<{ voteDate: string | null }>): ReactElement {
  return (
    <span style={{ fontSize: "0.6875rem", color: "var(--ink3)" }}>
      Bancas y bloques según la última votación nominal registrada
      {hasText(voteDate) ? ` (${formatDateAR(voteDate)})` : ""}. Fuente: Cámara de Diputados (datos abiertos).
    </span>
  );
}

export function DeputiesComposition(): ReactElement | null {
  const latestVoteQuery = useCongressVotes(LATEST_VOTE_PARAMS);
  const latestVote = latestVoteQuery.data?.[0];
  const detailsQuery = useCongressVoteDetails(latestVote?.vote_record_id ?? "");

  if (latestVoteQuery.isLoading || (latestVote !== undefined && detailsQuery.isLoading)) {
    return <Skeleton className="h-80 w-full rounded-[10px]" />;
  }

  const details = detailsQuery.data ?? [];
  if (latestVote === undefined || details.length === 0) {
    return null;
  }

  const blocs: HemicycleBloc[] = rankBlocsBySeatCount(details.map((detail) => detail.bloc));
  const seats = buildDeputySeats(details, blocs);

  const total = seats.length;
  const majority = majorityOf(total);

  return (
    <Card
      title="Composición de Diputados"
      subtitle={`${total} bancas · mayoría en ${majority} · pasá el mouse por cada banca`}
      footer={<DeputiesFooter voteDate={latestVote.date} />}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ maxWidth: 560, margin: "0 auto", width: "100%" }}>
          <HemicycleChart
            seats={seats}
            blocs={blocs}
            majority={majority}
            ariaLabel={`Hemiciclo de Diputados: ${total} bancas coloreadas por bloque`}
          />
        </div>
        <BlocLegend blocs={blocs} />
      </div>
    </Card>
  );
}
