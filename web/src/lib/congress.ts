export interface NormalizedResult {
  label: string;
  won: boolean;
}

export function normalizeResult(result: string | null): NormalizedResult {
  const won = (result ?? "").toUpperCase().startsWith("AFIRMAT");
  return { label: won ? "afirmativa" : "negativa", won };
}

export function blocColor(index: number): string {
  if (index < 6) {
    return `var(--serie-${index + 1})`;
  }
  return "var(--ink3)";
}

export interface BlocVoteTally {
  bloc: string;
  afirmativos: number;
  negativos: number;
  abstenciones: number;
  ausentes: number;
  total: number;
}

export function tallyByBloc(details: { bloc: string | null; vote: string | null }[]): BlocVoteTally[] {
  const byBloc = new Map<string, BlocVoteTally>();
  for (const detail of details) {
    const bloc = detail.bloc ?? "Sin bloque";
    const tally =
      byBloc.get(bloc) ??
      ({
        bloc,
        afirmativos: 0,
        negativos: 0,
        abstenciones: 0,
        ausentes: 0,
        total: 0,
      } as BlocVoteTally);
    const vote = (detail.vote ?? "").toUpperCase();
    if (vote.startsWith("AFIRMAT")) {
      tally.afirmativos += 1;
    } else if (vote.startsWith("NEGAT")) {
      tally.negativos += 1;
    } else if (vote.startsWith("ABSTEN")) {
      tally.abstenciones += 1;
    } else {
      tally.ausentes += 1;
    }
    tally.total += 1;
    byBloc.set(bloc, tally);
  }
  return Array.from(byBloc.values()).sort((a, b) => b.total - a.total);
}
