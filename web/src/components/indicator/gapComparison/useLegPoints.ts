import { useIndicatorSeries } from "@/hooks/useLabrecha";
import type { GapLeg } from "@/lib/gaps";
import { type ParsedPoint, mergePoints, parsePoints } from "@/lib/series";
import { hasText } from "@/lib/utils";

export interface LegPoints {
  isLoading: boolean;
  points: ParsedPoint[];
}

export function useLegPoints(leg: GapLeg, dateFrom: string | undefined): LegPoints {
  const liveQuery = useIndicatorSeries(leg.code, {
    source: leg.source,
    order: "asc",
    date_from: dateFrom,
  });
  const historyQuery = useIndicatorSeries(leg.code, {
    source: leg.historySource ?? leg.source,
    order: "asc",
    date_from: dateFrom,
  });
  const history = hasText(leg.historySource) ? parsePoints(historyQuery.data?.points ?? []) : [];
  return {
    isLoading: liveQuery.isLoading || historyQuery.isLoading,
    points: mergePoints(history, parsePoints(liveQuery.data?.points ?? [])),
  };
}
