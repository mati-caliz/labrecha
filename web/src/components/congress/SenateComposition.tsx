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
import { useSenateMembers } from "@/hooks/useLabrecha";
import {
  blocNameOrUnknown,
  blocRankLookup,
  majorityOf,
  rankBlocsBySeatCount,
} from "@/components/congress/hemicycleBlocs";
import type { Senator } from "@/lib/labrechaApi";
import { hasText } from "@/lib/utils";

const YEAR_LENGTH = 4;

function senatorFullName(senator: Senator): string {
  return [senator.first_name, senator.last_name].filter(Boolean).join(" ") || senator.senator_id;
}

function mandateYears(senator: Senator): string | null {
  const start = senator.mandate_start?.slice(0, YEAR_LENGTH);
  const end = senator.mandate_end?.slice(0, YEAR_LENGTH);
  if (!hasText(start) && !hasText(end)) {
    return null;
  }
  return `Mandato ${start ?? "?"}–${end ?? "?"}`;
}

export function SenateComposition(): ReactElement | null {
  const { data, isLoading } = useSenateMembers();

  if (isLoading) {
    return <Skeleton className="h-80 w-full rounded-[10px]" />;
  }

  const senators = data ?? [];
  if (senators.length === 0) {
    return null;
  }

  const blocs: HemicycleBloc[] = rankBlocsBySeatCount(senators.map((senator) => senator.bloc));
  const blocRank = blocRankLookup(blocs);
  const seats: HemicycleSeat[] = [...senators]
    .sort((first, second) => blocRank(first.bloc) - blocRank(second.bloc))
    .map((senator) => ({
      id: senator.senator_id,
      occupantName: senatorFullName(senator),
      bloc: blocNameOrUnknown(senator.bloc),
      detailLines: [
        senator.province,
        hasText(senator.party) && senator.party !== senator.bloc ? senator.party : null,
        mandateYears(senator),
      ].filter((line): line is string => line !== null && line !== ""),
    }));

  const total = seats.length;
  const majority = majorityOf(total);

  return (
    <Card
      title="Composición del Senado"
      subtitle={`${total} bancas · mayoría en ${majority} · pasá el mouse por cada banca`}
      footer={
        <span style={{ fontSize: "0.6875rem", color: "var(--ink3)" }}>
          Fuente: Senado de la Nación (datos abiertos)
        </span>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ maxWidth: 560, margin: "0 auto", width: "100%" }}>
          <HemicycleChart
            seats={seats}
            blocs={blocs}
            majority={majority}
            ariaLabel={`Hemiciclo del Senado: ${total} bancas coloreadas por bloque`}
          />
        </div>
        <BlocLegend blocs={blocs} />
      </div>
    </Card>
  );
}
