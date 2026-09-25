import type { Chamber } from "@/lib/chambers";
import {
  type BlocAttendance,
  type BlocSummary,
  type CongressVote,
  type CongressVoteDetail,
  type GapHistory,
  type GazetteSummary,
  type Holiday,
  type IndicatorSeries,
  type IndicatorSeriesParams,
  type IndicatorSourceSummary,
  type IndicatorSummary,
  type NewsArticle,
  type PoliticalEvent,
  type PoliticalEventsParams,
  type Post,
  type PostCategory,
  type RentByNeighborhood,
  type RevenueSharingShare,
  type SanctionedLaw,
  type ScrapeRun,
  type Senator,
  type SourceGap,
  type TaxChange,
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
  type IndicatorTerms,
  type IndicatorVariation,
  type ErrorEvent,
} from "@/lib/labrechaApi";

interface LabrechaQuery<Key extends readonly unknown[], Data> {
  queryKey: Key;
  queryFn: () => Promise<Data>;
}

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

export const indicatorsQuery = (): LabrechaQuery<
  readonly ["labrecha", "indicators"],
  IndicatorSummary[]
> => ({
  queryKey: labrechaKeys.indicators,
  queryFn: () => indicatorsApi.list(),
});

export const indicatorSeriesQuery = (
  code: string,
  params?: IndicatorSeriesParams,
): LabrechaQuery<readonly ["labrecha", "indicators", string, IndicatorSeriesParams], IndicatorSeries> => ({
  queryKey: labrechaKeys.indicatorSeries(code, params),
  queryFn: () => indicatorsApi.series(code, params),
});

export const indicatorSourcesQuery = (
  code: string,
): LabrechaQuery<readonly ["labrecha", "indicators", string, "sources"], IndicatorSourceSummary[]> => ({
  queryKey: labrechaKeys.indicatorSources(code),
  queryFn: () => indicatorsApi.sources(code),
});

export const politicalEventsQuery = (
  params?: PoliticalEventsParams,
): LabrechaQuery<readonly ["labrecha", "political-events", object], PoliticalEvent[]> => ({
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
}): LabrechaQuery<readonly ["labrecha", "congress", "votes", object], CongressVote[]> => ({
  queryKey: labrechaKeys.congressVotes(params),
  queryFn: () => congressApi.votes(params),
});

export const congressVoteQuery = (
  voteRecordId: string,
): LabrechaQuery<readonly ["labrecha", "congress", "votes", string], CongressVote> => ({
  queryKey: labrechaKeys.congressVote(voteRecordId),
  queryFn: () => congressApi.vote(voteRecordId),
});

export const congressVoteDetailsQuery = (
  voteRecordId: string,
  params?: { vote?: string; bloc?: string },
): LabrechaQuery<
  readonly ["labrecha", "congress", "votes", string, "details", object],
  CongressVoteDetail[]
> => ({
  queryKey: labrechaKeys.congressVoteDetails(voteRecordId, params),
  queryFn: () => congressApi.voteDetails(voteRecordId, params),
});

export const congressLawsQuery = (params?: {
  date_from?: string;
  date_to?: string;
  chamber?: string;
  limit?: number;
  offset?: number;
}): LabrechaQuery<readonly ["labrecha", "congress", "laws", object], SanctionedLaw[]> => ({
  queryKey: labrechaKeys.congressLaws(params),
  queryFn: () => congressApi.laws(params),
});

export const congressAttendanceQuery = (): LabrechaQuery<
  readonly ["labrecha", "congress", "attendance"],
  BlocAttendance[]
> => ({
  queryKey: labrechaKeys.congressAttendance,
  queryFn: () => congressApi.attendance(),
});

export const senateMembersQuery = (params?: {
  bloc?: string;
  province?: string;
}): LabrechaQuery<readonly ["labrecha", "senate", "members", object], Senator[]> => ({
  queryKey: labrechaKeys.senateMembers(params),
  queryFn: () => senateApi.members(params),
});

export const senateBlocsQuery = (): LabrechaQuery<
  readonly ["labrecha", "senate", "blocs"],
  BlocSummary[]
> => ({
  queryKey: labrechaKeys.senateBlocs,
  queryFn: () => senateApi.blocs(),
});

export const holidaysQuery = (params?: {
  year?: number;
  date_from?: string;
  date_to?: string;
}): LabrechaQuery<readonly ["labrecha", "holidays", object], Holiday[]> => ({
  queryKey: labrechaKeys.holidays(params),
  queryFn: () => holidaysApi.list(params),
});

export const newsQuery = (params?: {
  source?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): LabrechaQuery<readonly ["labrecha", "news", object], NewsArticle[]> => ({
  queryKey: labrechaKeys.news(params),
  queryFn: () => newsApi.list(params),
});

export const postsQuery = (params?: {
  category?: PostCategory;
  limit?: number;
  offset?: number;
}): LabrechaQuery<readonly ["labrecha", "posts", object], Post[]> => ({
  queryKey: labrechaKeys.posts(params),
  queryFn: () => postsApi.list(params),
});

export const postQuery = (slug: string): LabrechaQuery<readonly ["labrecha", "posts", string], Post> => ({
  queryKey: labrechaKeys.post(slug),
  queryFn: () => postsApi.bySlug(slug),
});

export const gazetteSummariesQuery = (params?: {
  category?: string;
  limit?: number;
  offset?: number;
}): LabrechaQuery<readonly ["labrecha", "gazette", object], GazetteSummary[]> => ({
  queryKey: labrechaKeys.gazette(params),
  queryFn: () => gazetteApi.summaries(params),
});

export const revenueSharingQuery = (): LabrechaQuery<
  readonly ["labrecha", "revenue-sharing"],
  RevenueSharingShare[]
> => ({
  queryKey: labrechaKeys.revenueSharing,
  queryFn: () => revenueSharingApi.shares(),
});

export const taxChangesQuery = (params?: {
  change_type?: string;
  jurisdiction?: string;
  limit?: number;
  offset?: number;
}): LabrechaQuery<readonly ["labrecha", "taxes", "changes", object], TaxChange[]> => ({
  queryKey: labrechaKeys.taxChanges(params),
  queryFn: () => taxesApi.changes(params),
});

export const errorEventsQuery = (params?: {
  limit?: number;
}): LabrechaQuery<readonly ["labrecha", "errors", object], ErrorEvent[]> => ({
  queryKey: labrechaKeys.errorEvents(params),
  queryFn: () => errorsApi.list(params),
});

export const scrapeRunsQuery = (params?: {
  limit?: number;
}): LabrechaQuery<readonly ["labrecha", "scrape-runs", object], ScrapeRun[]> => ({
  queryKey: labrechaKeys.scrapeRuns(params),
  queryFn: () => scrapeRunsApi.list(params),
});

export const rentByNeighborhoodQuery = (): LabrechaQuery<
  readonly ["labrecha", "housing", "rent-by-neighborhood"],
  RentByNeighborhood[]
> => ({
  queryKey: labrechaKeys.rentByNeighborhood,
  queryFn: () => housingApi.rentByNeighborhood(),
});

export const sourceGapsQuery = (params?: {
  limit?: number;
  min_sources?: number;
}): LabrechaQuery<readonly ["labrecha", "gaps", object], SourceGap[]> => ({
  queryKey: labrechaKeys.sourceGaps(params),
  queryFn: () => gapsApi.list(params),
});

export const gapHistoryQuery = (
  code: string,
): LabrechaQuery<readonly ["labrecha", "gap-history", string], GapHistory> => ({
  queryKey: labrechaKeys.gapHistory(code),
  queryFn: () => gapsApi.history(code),
});

export const indicatorVariationQuery = (
  code: string,
  params: { date_from: string; source?: string },
): LabrechaQuery<readonly ["labrecha", "indicator-variation", string, object], IndicatorVariation> => ({
  queryKey: labrechaKeys.indicatorVariation(code, params),
  queryFn: () => indicatorsApi.variation(code, params),
});

export const indicatorTermsQuery = (
  code: string,
  params?: { source?: string },
): LabrechaQuery<readonly ["labrecha", "terms", string, object], IndicatorTerms> => ({
  queryKey: labrechaKeys.indicatorTerms(code, params),
  queryFn: () => termsApi.byIndicator(code, params),
});
