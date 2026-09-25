import type { HemicycleBloc } from "@/components/congress/HemicycleChart";
import { blocColor } from "@/lib/congress";

export const UNKNOWN_BLOC = "Sin bloque";

export function blocNameOrUnknown(bloc: string | null | undefined): string {
  return bloc ?? UNKNOWN_BLOC;
}

function compareBlocsBySeatCount(first: [string, number], second: [string, number]): number {
  const bySeatCount = second[1] - first[1];
  if (bySeatCount !== 0) {
    return bySeatCount;
  }
  return first[0].localeCompare(second[0]);
}

export function rankBlocsBySeatCount(blocNames: readonly (string | null | undefined)[]): HemicycleBloc[] {
  const countByBloc = new Map<string, number>();
  for (const blocName of blocNames) {
    const bloc = blocNameOrUnknown(blocName);
    countByBloc.set(bloc, (countByBloc.get(bloc) ?? 0) + 1);
  }
  return [...countByBloc.entries()]
    .sort(compareBlocsBySeatCount)
    .map(([name, count], index) => ({ name, count, color: blocColor(index) }));
}

export function blocRankLookup(blocs: readonly HemicycleBloc[]): (bloc: string | null | undefined) => number {
  const blocOrder = new Map(blocs.map((bloc, index) => [bloc.name, index]));
  return (bloc) => blocOrder.get(blocNameOrUnknown(bloc)) ?? Number.MAX_SAFE_INTEGER;
}

export function majorityOf(total: number): number {
  return Math.floor(total / 2) + 1;
}
