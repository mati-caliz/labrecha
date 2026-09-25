import { CALCULATOR_PATHS } from "@/lib/calculatorPaths";
import type {
  CompoundInterestRequest,
  CompoundInterestResponse,
  IncomeTaxRequest,
  IncomeTaxResponse,
  InflationAdjustmentRequest,
  InflationAdjustmentResponse,
  TaxImpactRequest,
  TaxImpactResponse,
} from "@/lib/calculatorTypes";
import type { Chamber } from "@/lib/chambers";
import type {
  BlocAttendance,
  BlocSummary,
  CongressVote,
  CongressVoteDetail,
  SanctionedLaw,
  Senator,
} from "@/lib/congressTypes";
import type { ErrorReport } from "@/lib/errorReporter";
import { buildQueryString, serverGet, serverPost } from "@/lib/serverApi";
import axios from "axios";
import { hasText } from "@/lib/utils";

export type * from "@/lib/calculatorTypes";
export type * from "@/lib/congressTypes";

const configuredApiUrl = process.env.NEXT_PUBLIC_LABRECHA_API_URL;
const LABRECHA_API_URL = hasText(configuredApiUrl) ? configuredApiUrl : "/api/data";

export const labrechaApi = axios.create({
  baseURL: LABRECHA_API_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export type SortOrder = "asc" | "desc";

export interface IndicatorSummary {
  indicator_code: string;
  sources: string[];
  count: number;
  first_date: string;
  last_date: string;
}

export interface IndicatorSourceSummary {
  source: string;
  count: number;
  first_date: string;
  last_date: string;
  latest_value: string;
}

export interface IndicatorPoint {
  date: string;
  value: string;
  source: string;
  meta: Record<string, unknown>;
}

export interface IndicatorSeries {
  indicator_code: string;
  points: IndicatorPoint[];
}

export interface GapMeasurement {
  source: string;
  value: string;
}

export interface GapExclusion {
  source: string;
  reason: string;
}

export interface SourceGap {
  indicator_code: string;
  date: string;
  higher_source: string;
  higher_value: string;
  lower_source: string;
  lower_value: string;
  spread: string;
  gap_pct: number;
  unit: string;
  measurements: GapMeasurement[];
  excluded_sources: GapExclusion[];
}

export interface GapHistoryPoint {
  date: string;
  higher_source: string;
  lower_source: string;
  spread: string;
  gap_pct: number;
  sources: number;
}

export interface GapHistory {
  indicator_code: string;
  unit: string;
  points: GapHistoryPoint[];
  widest: GapHistoryPoint;
  narrowest: GapHistoryPoint;
  latest: GapHistoryPoint;
}

export type TermMethod = "COMPOUNDED" | "ENDPOINTS";

export interface IndicatorTermStat {
  term_id: string;
  president: string;
  start: string;
  end: string | null;
  first_date: string;
  last_date: string;
  first_value: string;
  last_value: string;
  average: string;
  points: number;
  change_pct: string;
  annualized_pct: string | null;
}

export interface IndicatorTerms {
  indicator_code: string;
  source: string;
  method: TermMethod;
  terms: IndicatorTermStat[];
}

export interface IndicatorVariation {
  indicator_code: string;
  source: string;
  method: TermMethod;
  requested_from: string;
  first_date: string;
  last_date: string;
  first_value: string;
  last_value: string;
  points: number;
  change_pct: string;
  annualized_pct: string | null;
}

export interface PoliticalEvent {
  date: string;
  title: string;
  category: string;
  description: string | null;
}

export interface Holiday {
  date: string;
  name: string;
  local_name: string | null;
  is_global: boolean | null;
  is_fixed: boolean | null;
  types: string | null;
}

export interface RentByNeighborhood {
  neighborhood: string;
  commune: string | null;
  date: string;
  price: string;
  rooms: string | null;
}

export interface RevenueSharingShare {
  province: string;
  coefficient: string;
  share_pct: string;
}

export interface GazetteSummary {
  regulation_id: string;
  date: string;
  section: string;
  title: string;
  summary: string[];
  category: string;
  url: string;
}

export interface TaxChange {
  regulation_id: string;
  date: string;
  change_type: string;
  tax_name: string;
  jurisdiction: string;
  title: string;
  url: string;
}

export interface ScrapeRun {
  job_name: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  rows_upserted: number | null;
  error: string | null;
}

export interface NewsArticle {
  title: string;
  summary: string;
  source: string;
  source_url: string;
  category: string;
  published_date: string;
  image_url: string | null;
}

export const POST_CATEGORIES = ["idea", "ley", "analisis", "nota"] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number];

export const POST_IMPACT_KINDS = [
  "tiempo",
  "dinero",
  "ambiente",
  "vidas",
  "estado",
  "transparencia",
] as const;

export type PostImpactKind = (typeof POST_IMPACT_KINDS)[number];

export interface PostImpact {
  kind: PostImpactKind;
  value: string;
  label: string;
}

export interface Post {
  id: number;
  slug: string;
  title: string;
  category: PostCategory;
  summary: string | null;
  content: string;
  impacts: PostImpact[] | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface PoliticalEventsParams {
  date_from?: string | undefined;
  date_to?: string | undefined;
  category?: string | undefined;
}

export interface IndicatorSeriesParams {
  source?: string | undefined;
  date_from?: string | undefined;
  date_to?: string | undefined;
  limit?: number | undefined;
  order?: SortOrder | undefined;
}

async function get<T>(path: string, params?: object): Promise<T> {
  if (typeof window === "undefined") {
    return await serverGet<T>(`${path}${buildQueryString(params)}`);
  }
  const response = await labrechaApi.get<T>(path, { params });
  return response.data;
}

function isomorphicPost<T>(path: string, body: unknown): Promise<T> {
  if (typeof window === "undefined") {
    return serverPost<T>(path, body);
  }
  return post<T>(path, body);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await labrechaApi.post<T>(path, body);
  return response.data;
}

export const indicatorsApi = {
  list: () => get<IndicatorSummary[]>("/indicators"),
  series: (code: string, params?: IndicatorSeriesParams) =>
    get<IndicatorSeries>(`/indicators/${code}`, params),
  sources: (code: string) => get<IndicatorSourceSummary[]>(`/indicators/${code}/sources`),
  variation: (code: string, params: { date_from: string; source?: string }) =>
    get<IndicatorVariation>(`/indicators/${code}/variation`, params),
};

export const politicalEventsApi = {
  list: (params?: PoliticalEventsParams) => get<PoliticalEvent[]>("/political-events", params),
};

export const congressApi = {
  votes: (params?: {
    date_from?: string;
    date_to?: string;
    result?: string;
    chamber?: Chamber;
    period_number?: number;
    limit?: number;
    offset?: number;
  }) => get<CongressVote[]>("/congress/votes", params),
  vote: (actaId: string) => get<CongressVote>(`/congress/votes/${actaId}`),
  voteDetails: (actaId: string, params?: { vote?: string; bloc?: string }) =>
    get<CongressVoteDetail[]>(`/congress/votes/${actaId}/details`, params),
  laws: (params?: {
    date_from?: string;
    date_to?: string;
    chamber?: string;
    limit?: number;
    offset?: number;
  }) => get<SanctionedLaw[]>("/congress/laws", params),
  attendance: (params?: { chamber?: Chamber }) => get<BlocAttendance[]>("/congress/attendance", params),
};

export const senateApi = {
  members: (params?: { bloc?: string; province?: string }) => get<Senator[]>("/senate/members", params),
  blocs: () => get<BlocSummary[]>("/senate/blocs"),
};

export const holidaysApi = {
  list: (params?: { year?: number; date_from?: string; date_to?: string }) =>
    get<Holiday[]>("/holidays", params),
};

export const newsApi = {
  list: (params?: { source?: string; category?: string; limit?: number; offset?: number }) =>
    get<NewsArticle[]>("/news", params),
};

export const postsApi = {
  list: (params?: { category?: PostCategory; limit?: number; offset?: number }) =>
    get<Post[]>("/posts", params),
  bySlug: (slug: string) => get<Post>(`/posts/${slug}`),
};

export const gazetteApi = {
  summaries: (params?: { category?: string; limit?: number; offset?: number }) =>
    get<GazetteSummary[]>("/gazette/summaries", params),
};

export const taxesApi = {
  changes: (params?: { change_type?: string; jurisdiction?: string; limit?: number; offset?: number }) =>
    get<TaxChange[]>("/taxes/changes", params),
};

export const gapsApi = {
  list: (params?: { limit?: number; min_sources?: number }) => get<SourceGap[]>("/gaps", params),
  byCode: (code: string) => get<SourceGap>(`/gaps/${code}`),
  history: (code: string) => get<GapHistory>(`/gaps/${code}/history`),
};

export const termsApi = {
  byIndicator: (code: string, params?: { source?: string }) => get<IndicatorTerms>(`/terms/${code}`, params),
};

export interface ErrorEvent {
  fingerprint: string;
  origin: string;
  kind: string;
  message: string;
  stack: string | null;
  path: string | null;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
}

export const errorsApi = {
  report: (report: ErrorReport) => isomorphicPost<ErrorEvent>("/errors", report),
  list: (params?: { limit?: number }) => get<ErrorEvent[]>("/errors", params),
};

export const scrapeRunsApi = {
  list: (params?: { limit?: number }) => get<ScrapeRun[]>("/scrape-runs", params),
};

export const revenueSharingApi = {
  shares: () => get<RevenueSharingShare[]>("/revenue-sharing"),
};

export const housingApi = {
  rentByNeighborhood: () => get<RentByNeighborhood[]>("/housing/rent-by-neighborhood"),
};

export const calculatorsApi = {
  compoundInterest: (body: CompoundInterestRequest) =>
    post<CompoundInterestResponse>(`/${CALCULATOR_PATHS.compoundInterest}`, body),
  inflationAdjustment: (body: InflationAdjustmentRequest) =>
    post<InflationAdjustmentResponse>(`/${CALCULATOR_PATHS.inflationAdjustment}`, body),
  incomeTax: (body: IncomeTaxRequest) => post<IncomeTaxResponse>(`/${CALCULATOR_PATHS.incomeTax}`, body),
  taxImpact: (body: TaxImpactRequest) => post<TaxImpactResponse>(`/${CALCULATOR_PATHS.taxImpact}`, body),
};
