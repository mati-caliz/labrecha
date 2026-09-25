import type { Chamber } from "@/lib/chambers";
import {
  type IndicatorSeriesParams,
  type PoliticalEventsParams,
  type PostCategory,
  congressApi,
  errorsApi,
  gapsApi,
  gazetteApi,
  holidaysApi,
  housingApi,
  indicatorsApi,
  newsApi,
  politicalEventsApi,
  postsApi,
  revenueSharingApi,
  scrapeRunsApi,
  senateApi,
  taxesApi,
  termsApi,
} from "@/lib/labrechaApi";

export const labrechaKeys = {
  indicators: ["labrecha", "indicators"] as const,
  indicatorSeries: (code: string, params?: IndicatorSeriesParams) =>
    ["labrecha", "indicators", code, params ?? {}] as const,
  indicatorSources: (code: string) => ["labrecha", "indicators", code, "sources"] as const,
  politicalEvents: (params?: object) => ["labrecha", "political-events", params ?? {}] as const,
  congressVotes: (params?: object) => ["labrecha", "congress", "votes", params ?? {}] as const,
  congressVote: (voteRecordId: string) => ["labrecha", "congress", "votes", voteRecordId] as const,
  congressLaws: (params?: object) => ["labrecha", "congress", "laws", params ?? {}] as const,
  congressAttendance: ["labrecha", "congress", "attendance"] as const,
  congressVoteDetails: (voteRecordId: string, params?: object) =>
    ["labrecha", "congress", "votes", voteRecordId, "details", params ?? {}] as const,
  senateMembers: (params?: object) => ["labrecha", "senate", "members", params ?? {}] as const,
  senateBlocs: ["labrecha", "senate", "blocs"] as const,
  holidays: (params?: object) => ["labrecha", "holidays", params ?? {}] as const,
  news: (params?: object) => ["labrecha", "news", params ?? {}] as const,
  posts: (params?: object) => ["labrecha", "posts", params ?? {}] as const,
  post: (slug: string) => ["labrecha", "posts", slug] as const,
  gazette: (params?: object) => ["labrecha", "gazette", params ?? {}] as const,
  revenueSharing: ["labrecha", "revenue-sharing"] as const,
  taxChanges: (params?: object) => ["labrecha", "taxes", "changes", params ?? {}] as const,
  rentByNeighborhood: ["labrecha", "housing", "rent-by-neighborhood"] as const,
  errorEvents: (params?: object) => ["labrecha", "errors", params ?? {}] as const,
  scrapeRuns: (params?: object) => ["labrecha", "scrape-runs", params ?? {}] as const,
  sourceGaps: (params?: object) => ["labrecha", "gaps", params ?? {}] as const,
  gapHistory: (code: string) => ["labrecha", "gap-history", code] as const,
  indicatorVariation: (code: string, params: object) =>
    ["labrecha", "indicator-variation", code, params] as const,
  indicatorTerms: (code: string, params?: object) => ["labrecha", "terms", code, params ?? {}] as const,
};

export const indicatorsQuery = () => ({
  queryKey: labrechaKeys.indicators,
  queryFn: () => indicatorsApi.list(),
});

export const indicatorSeriesQuery = (code: string, params?: IndicatorSeriesParams) => ({
  queryKey: labrechaKeys.indicatorSeries(code, params),
  queryFn: () => indicatorsApi.series(code, params),
});

export const indicatorSourcesQuery = (code: string) => ({
  queryKey: labrechaKeys.indicatorSources(code),
  queryFn: () => indicatorsApi.sources(code),
});

export const politicalEventsQuery = (params?: PoliticalEventsParams) => ({
  queryKey: labrechaKeys.politicalEvents(params),
  queryFn: () => politicalEventsApi.list(params),
});

export const congressVotesQuery = (params?: {
  date_from?: string;
  date_to?: string;
  result?: string;
  chamber?: Chamber;
  period_number?: number;
  limit?: number;
  offset?: number;
}) => ({
  queryKey: labrechaKeys.congressVotes(params),
  queryFn: () => congressApi.votes(params),
});

export const congressVoteQuery = (voteRecordId: string) => ({
  queryKey: labrechaKeys.congressVote(voteRecordId),
  queryFn: () => congressApi.vote(voteRecordId),
});

export const congressVoteDetailsQuery = (
  voteRecordId: string,
  params?: { vote?: string; bloc?: string },
) => ({
  queryKey: labrechaKeys.congressVoteDetails(voteRecordId, params),
  queryFn: () => congressApi.voteDetails(voteRecordId, params),
});

export const congressLawsQuery = (params?: {
  date_from?: string;
  date_to?: string;
  chamber?: string;
  limit?: number;
  offset?: number;
}) => ({
  queryKey: labrechaKeys.congressLaws(params),
  queryFn: () => congressApi.laws(params),
});

export const congressAttendanceQuery = () => ({
  queryKey: labrechaKeys.congressAttendance,
  queryFn: () => congressApi.attendance(),
});

export const senateMembersQuery = (params?: { bloc?: string; province?: string }) => ({
  queryKey: labrechaKeys.senateMembers(params),
  queryFn: () => senateApi.members(params),
});

export const senateBlocsQuery = () => ({
  queryKey: labrechaKeys.senateBlocs,
  queryFn: () => senateApi.blocs(),
});

export const holidaysQuery = (params?: { year?: number; date_from?: string; date_to?: string }) => ({
  queryKey: labrechaKeys.holidays(params),
  queryFn: () => holidaysApi.list(params),
});

export const newsQuery = (params?: {
  source?: string;
  category?: string;
  limit?: number;
  offset?: number;
}) => ({
  queryKey: labrechaKeys.news(params),
  queryFn: () => newsApi.list(params),
});

export const postsQuery = (params?: { category?: PostCategory; limit?: number; offset?: number }) => ({
  queryKey: labrechaKeys.posts(params),
  queryFn: () => postsApi.list(params),
});

export const postQuery = (slug: string) => ({
  queryKey: labrechaKeys.post(slug),
  queryFn: () => postsApi.bySlug(slug),
});

export const gazetteSummariesQuery = (params?: { category?: string; limit?: number; offset?: number }) => ({
  queryKey: labrechaKeys.gazette(params),
  queryFn: () => gazetteApi.summaries(params),
});

export const revenueSharingQuery = () => ({
  queryKey: labrechaKeys.revenueSharing,
  queryFn: () => revenueSharingApi.shares(),
});

export const taxChangesQuery = (params?: {
  change_type?: string;
  jurisdiction?: string;
  limit?: number;
  offset?: number;
}) => ({
  queryKey: labrechaKeys.taxChanges(params),
  queryFn: () => taxesApi.changes(params),
});

export const errorEventsQuery = (params?: { limit?: number }) => ({
  queryKey: labrechaKeys.errorEvents(params),
  queryFn: () => errorsApi.list(params),
});

export const scrapeRunsQuery = (params?: { limit?: number }) => ({
  queryKey: labrechaKeys.scrapeRuns(params),
  queryFn: () => scrapeRunsApi.list(params),
});

export const rentByNeighborhoodQuery = () => ({
  queryKey: labrechaKeys.rentByNeighborhood,
  queryFn: () => housingApi.rentByNeighborhood(),
});

export const sourceGapsQuery = (params?: { limit?: number; min_sources?: number }) => ({
  queryKey: labrechaKeys.sourceGaps(params),
  queryFn: () => gapsApi.list(params),
});

export const gapHistoryQuery = (code: string) => ({
  queryKey: labrechaKeys.gapHistory(code),
  queryFn: () => gapsApi.history(code),
});

export const indicatorVariationQuery = (code: string, params: { date_from: string; source?: string }) => ({
  queryKey: labrechaKeys.indicatorVariation(code, params),
  queryFn: () => indicatorsApi.variation(code, params),
});

export const indicatorTermsQuery = (code: string, params?: { source?: string }) => ({
  queryKey: labrechaKeys.indicatorTerms(code, params),
  queryFn: () => termsApi.byIndicator(code, params),
});
