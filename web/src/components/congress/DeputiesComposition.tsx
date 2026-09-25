"use client";

import {
  BlocLegend,
  type HemicycleBloc,
  HemicycleChart,
  type HemicycleSeat,
} from "@/components/congress/HemicycleChart";
import { Card } from "@/components/core";
import { Skeleton } from "@/components/ui/skeleton";
import { useCongressVoteDetails, useCongressVotes } from "@/hooks/useLabrecha";
import { blocColor } from "@/lib/congress";
import { LATEST_VOTE_PARAMS } from "@/lib/queryParams";
import { formatDateAR } from "@/lib/indicators";

const UNKNOWN_BLOC = "Sin bloque";

export function DeputiesComposition() {
  const latestVoteQuery = useCongressVotes(LATEST_VOTE_PARAMS);
  const latestVote = latestVoteQuery.data?.[0];
  const detailsQuery = useCongressVoteDetails(latestVote?.vote_record_id ?? "");

  if (latestVoteQuery.isLoading || (latestVote && detailsQuery.isLoading)) {
    return <Skeleton className="h-80 w-full rounded-[10px]" />;
  }

  const details = detailsQuery.data ?? [];
  if (!latestVote || details.length === 0) {
    return null;
  }

  const countByBloc = new Map<string, number>();
  for (const detail of details) {
    const bloc = detail.bloc ?? UNKNOWN_BLOC;
    countByBloc.set(bloc, (countByBloc.get(bloc) ?? 0) + 1);
  }
  const blocs: HemicycleBloc[] = [...countByBloc.entries()]
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
    .map(([name, count], index) => ({ name, count, color: blocColor(index) }));

  const blocOrder = new Map(blocs.map((bloc, index) => [bloc.name, index]));
  const seats: HemicycleSeat[] = [...details]
    .sort((first, second) => {
      const firstBloc = blocOrder.get(first.bloc ?? UNKNOWN_BLOC) ?? Number.MAX_SAFE_INTEGER;
      const secondBloc = blocOrder.get(second.bloc ?? UNKNOWN_BLOC) ?? Number.MAX_SAFE_INTEGER;
      if (firstBloc !== secondBloc) {
        return firstBloc - secondBloc;
      }
      return (first.legislator_name ?? "").localeCompare(second.legislator_name ?? "");
    })
    .map((detail, index) => ({
      id: `${detail.legislator_name ?? "banca"}-${index}`,
      occupantName: detail.legislator_name ?? "Banca sin datos",
      bloc: detail.bloc ?? UNKNOWN_BLOC,
      detailLines: [detail.district].filter((line): line is string => line !== null && line !== ""),
    }));

  const total = seats.length;
  const majority = Math.floor(total / 2) + 1;

  return (
    <Card
      title="Composición de Diputados"
      subtitle={`${total} bancas · mayoría en ${majority} · pasá el mouse por cada banca`}
      footer={
        <span style={{ fontSize: "0.6875rem", color: "var(--ink3)" }}>
          Bancas y bloques según la última votación nominal registrada
          {latestVote.date ? ` (${formatDateAR(latestVote.date)})` : ""}. Fuente: Cámara de Diputados (datos
          abiertos).
        </span>
      }
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
