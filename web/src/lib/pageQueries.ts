import { GAPS } from "@/lib/gaps";
import { DEFAULT_RANGE, INDICATOR_BY_CODE, RANGE_MONTHS, getIndicatorDisplay } from "@/lib/indicators";
import type { IndicatorSourceSummary } from "@/lib/labrechaApi";
import {
  congressAttendanceQuery,
  congressLawsQuery,
  congressVoteDetailsQuery,
  congressVoteQuery,
  congressVotesQuery,
  errorEventsQuery,
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
  scrapeRunsQuery,
  senateMembersQuery,
  sourceGapsQuery,
} from "@/lib/queries";
import {
  HERO_CODE,
  HERO_POINTS,
  HERO_SOURCE,
  HOME_POSTS_PARAMS,
  LATEST_VOTE_PARAMS,
  NEWS_LIMIT,
  RECENT_LAWS_PARAMS,
  RECENT_VOTES_PARAMS,
  RELATED_POSTS_PARAMS,
  SCRAPE_RUNS_PARAMS,
  TEASER_CODES,
  TILE_CODES,
} from "@/lib/queryParams";
import { latestSourceDate, orderIndicatorSources, rangeDateFrom, todayISO } from "@/lib/series";
import { VOTE_OUTCOMES } from "@/lib/voteOutcomes";
import { hasText } from "@/lib/utils";

export interface PageQuery {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
}

const DEFAULT_RANGE_MONTHS = RANGE_MONTHS[DEFAULT_RANGE] ?? 12;

function tileSeriesQuery(code: string): PageQuery {
  const indicator = INDICATOR_BY_CODE[code] ?? getIndicatorDisplay(code);
  return indicatorSeriesQuery(indicator.code, {
    source: indicator.preferredSource,
    limit: indicator.sparkPoints,
    order: "desc",
  });
}

export function layoutQueries(): PageQuery[] {
  return [indicatorsQuery()];
}

export function homeQueries(): PageQuery[] {
  return [
    indicatorSeriesQuery(HERO_CODE, {
      source: HERO_SOURCE,
      limit: HERO_POINTS,
      order: "desc",
    }),
    ...TILE_CODES.map(tileSeriesQuery),
    ...TEASER_CODES.map((code) => indicatorSourcesQuery(code)),
    politicalEventsQuery(),
    postsQuery(),
    postsQuery(HOME_POSTS_PARAMS),
  ];
}

export function indicatorCatalogQueries(): PageQuery[] {
  return [indicatorsQuery()];
}

export function methodologyQueries(): PageQuery[] {
  return [indicatorsQuery()];
}

export async function indicatorDetailData(
  code: string,
): Promise<{ queries: PageQuery[]; sources: IndicatorSourceSummary[] }> {
  const sourcesQuery = indicatorSourcesQuery(code);
  const queries: PageQuery[] = [sourcesQuery];

  const sources = await sourcesQuery.queryFn().catch(() => [] as IndicatorSourceSummary[]);
  const ordered = orderIndicatorSources(sources, getIndicatorDisplay(code).preferredSource);
  if (ordered.length === 0) {
    return { queries, sources: ordered };
  }

  const latestDate = latestSourceDate(ordered);
  const dateFrom = rangeDateFrom(latestDate, DEFAULT_RANGE_MONTHS);
  for (const summary of ordered) {
    queries.push(indicatorSeriesQuery(code, { order: "asc", date_from: dateFrom, source: summary.source }));
  }
  queries.push(politicalEventsQuery({ date_from: dateFrom, date_to: latestDate }));
  queries.push(politicalEventsQuery());
  const primary = ordered[0];
  if (primary !== undefined) {
    queries.push(indicatorTermsQuery(code, { source: primary.source }));
  }
  return { queries, sources: ordered };
}

export function gapsQueries(): PageQuery[] {
  const today = todayISO();
  const dateFrom = rangeDateFrom(today, DEFAULT_RANGE_MONTHS);
  const queries: PageQuery[] = [
    politicalEventsQuery({ date_from: dateFrom, date_to: today }),
    sourceGapsQuery(),
  ];

  for (const gap of GAPS) {
    for (const leg of gap.legs) {
      queries.push(
        indicatorSeriesQuery(leg.code, { source: leg.source, limit: 1, order: "desc" }),
        indicatorSeriesQuery(leg.code, { source: leg.source, order: "asc", date_from: dateFrom }),
        indicatorSeriesQuery(leg.code, {
          source: leg.historySource ?? leg.source,
          order: "asc",
          date_from: dateFrom,
        }),
      );
    }
  }
  return queries;
}

export function newsQueries(): PageQuery[] {
  return [newsQuery({ limit: NEWS_LIMIT })];
}

export function postsFeedQueries(): PageQuery[] {
  return [postsQuery()];
}

export function postDetailQueries(slug: string): PageQuery[] {
  return [postQuery(slug), postsQuery(RELATED_POSTS_PARAMS)];
}

export async function congressQueries(): Promise<PageQuery[]> {
  const latestVoteQuery = congressVotesQuery(LATEST_VOTE_PARAMS);
  const recentVotesQuery = congressVotesQuery(RECENT_VOTES_PARAMS);
  const queries: PageQuery[] = [
    latestVoteQuery,
    recentVotesQuery,
    congressAttendanceQuery(),
    congressLawsQuery(RECENT_LAWS_PARAMS),
    senateMembersQuery(),
  ];

  const latestVotes = await latestVoteQuery.queryFn().catch(() => []);
  const latestVoteRecordId = latestVotes[0]?.vote_record_id;
  if (latestVoteRecordId !== undefined) {
    queries.push(congressVoteDetailsQuery(latestVoteRecordId));
  }

  queries.push(...(await curatedOutcomeQueries()));
  return queries;
}

async function curatedOutcomeQueries(): Promise<PageQuery[]> {
  const queries: PageQuery[] = [];
  for (const outcome of VOTE_OUTCOMES) {
    const voteQuery = congressVoteQuery(outcome.voteRecordId);
    queries.push(voteQuery);
    const vote = await voteQuery.queryFn().catch(() => undefined);
    if (hasText(vote?.date)) {
      queries.push(indicatorVariationQuery(outcome.indicatorCode, { date_from: vote.date }));
    }
  }
  return queries;
}

export function congressVoteQueries(voteRecordId: string): PageQuery[] {
  return [congressVoteQuery(voteRecordId), congressVoteDetailsQuery(voteRecordId)];
}

export function holidaysQueries(): PageQuery[] {
  return [holidaysQuery({ year: new Date().getUTCFullYear() })];
}

export function scrapeStatusQueries(): PageQuery[] {
  return [errorEventsQuery(), scrapeRunsQuery(SCRAPE_RUNS_PARAMS), indicatorsQuery()];
}
