import type { Chamber } from "@/lib/chambers";
import type { IndicatorSeriesParams, PoliticalEventsParams, PostCategory } from "@/lib/labrechaApi";
import {
  congressAttendanceQuery,
  congressLawsQuery,
  congressVoteDetailsQuery,
  congressVoteQuery,
  congressVotesQuery,
  errorEventsQuery,
  gazetteSummariesQuery,
  holidaysQuery,
  indicatorSeriesQuery,
  indicatorSourcesQuery,
  indicatorTermsQuery,
  indicatorVariationQuery,
  indicatorsQuery,
  newsQuery,
  politicalEventsQuery,
  postQuery,
  postsQuery,
  rentByNeighborhoodQuery,
  revenueSharingQuery,
  scrapeRunsQuery,
  senateBlocsQuery,
  senateMembersQuery,
  gapHistoryQuery,
  sourceGapsQuery,
  taxChangesQuery,
} from "@/lib/queries";
import { useQueries, useQuery } from "@tanstack/react-query";

export { labrechaKeys } from "@/lib/queries";

export function useIndicators() {
  return useQuery(indicatorsQuery());
}

export function useIndicatorSeries(code: string, params?: IndicatorSeriesParams) {
  return useQuery({ ...indicatorSeriesQuery(code, params), enabled: Boolean(code) });
}

export function useIndicatorSeriesMulti(code: string, sources: string[], params?: IndicatorSeriesParams) {
  return useQueries({
    queries: sources.map((source) => ({
      ...indicatorSeriesQuery(code, { ...params, source }),
      enabled: Boolean(code),
    })),
  });
}

export function useLegLatest(legs: { code: string; source: string }[]) {
  return useQueries({
    queries: legs.map((leg) =>
      indicatorSeriesQuery(leg.code, { source: leg.source, limit: 1, order: "desc" }),
    ),
  });
}

export function useIndicatorSources(code: string) {
  return useQuery({ ...indicatorSourcesQuery(code), enabled: Boolean(code) });
}

export function usePoliticalEvents(params?: PoliticalEventsParams) {
  return useQuery(politicalEventsQuery(params));
}

export function useCongressVotes(params?: {
  date_from?: string;
  date_to?: string;
  result?: string;
  chamber?: Chamber;
  period_number?: number;
  limit?: number;
  offset?: number;
}) {
  return useQuery(congressVotesQuery(params));
}

export function useCongressLaws(params?: {
  date_from?: string;
  date_to?: string;
  chamber?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery(congressLawsQuery(params));
}

export function useCongressAttendance() {
  return useQuery(congressAttendanceQuery());
}

export function useCongressVote(voteRecordId: string) {
  return useQuery({ ...congressVoteQuery(voteRecordId), enabled: Boolean(voteRecordId) });
}

export function useCongressVoteDetails(voteRecordId: string, params?: { vote?: string; bloc?: string }) {
  return useQuery({
    ...congressVoteDetailsQuery(voteRecordId, params),
    enabled: Boolean(voteRecordId),
  });
}

export function useSenateMembers(params?: { bloc?: string; province?: string }) {
  return useQuery(senateMembersQuery(params));
}

export function useSenateBlocs() {
  return useQuery(senateBlocsQuery());
}

export function useHolidays(params?: { year?: number; date_from?: string; date_to?: string }) {
  return useQuery(holidaysQuery(params));
}

export function useNews(params?: { source?: string; category?: string; limit?: number; offset?: number }) {
  return useQuery(newsQuery(params));
}

export function usePosts(params?: { category?: PostCategory; limit?: number; offset?: number }) {
  return useQuery(postsQuery(params));
}

export function usePost(slug: string) {
  return useQuery({ ...postQuery(slug), enabled: Boolean(slug) });
}

export function useBoletinSummaries(params?: { category?: string; limit?: number; offset?: number }) {
  return useQuery(gazetteSummariesQuery(params));
}

export function useCoparticipacion() {
  return useQuery(revenueSharingQuery());
}

export function useTaxChanges(params?: {
  change_type?: string;
  jurisdiction?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery(taxChangesQuery(params));
}

export function useErrorEvents(params?: { limit?: number }) {
  return useQuery(errorEventsQuery(params));
}

export function useScrapeRuns(params?: { limit?: number }) {
  return useQuery(scrapeRunsQuery(params));
}

export function useRentByNeighborhood() {
  return useQuery(rentByNeighborhoodQuery());
}

export function useSourceGaps(params?: { limit?: number; min_sources?: number }) {
  return useQuery(sourceGapsQuery(params));
}

export function useGapHistory(code: string) {
  return useQuery({ ...gapHistoryQuery(code), enabled: Boolean(code) });
}

export function useIndicatorTerms(code: string, params?: { source?: string }) {
  return useQuery({ ...indicatorTermsQuery(code, params), enabled: Boolean(code) });
}

export function useIndicatorVariation(
  code: string,
  params: { date_from: string; source?: string },
  enabled = true,
) {
  return useQuery({
    ...indicatorVariationQuery(code, params),
    enabled: enabled && Boolean(code) && Boolean(params.date_from),
    retry: false,
  });
}
