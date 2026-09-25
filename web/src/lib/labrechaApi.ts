import { CALCULATOR_PATHS } from "@/lib/calculatorPaths";
import type { Chamber } from "@/lib/chambers";
import type { ErrorReport } from "@/lib/errorReporter";
import { buildQueryString, serverGet, serverPost } from "@/lib/serverApi";
import axios from "axios";

const LABRECHA_API_URL = process.env.NEXT_PUBLIC_LABRECHA_API_URL || "/api/data";

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

export interface CongressVote {
  vote_record_id: string;
  chamber: Chamber;
  period_number: number | null;
  session_type: string | null;
  date: string | null;
  title: string | null;
  vote_type: string | null;
  result: string | null;
  president_name: string | null;
  affirmative_votes: number | null;
  negative_votes: number | null;
  abstentions: number | null;
  absents: number | null;
  summary: string | null;
  topic: string | null;
}

export interface CongressVoteDetail {
  vote_record_id: string;
  legislator_name: string | null;
  bloc: string | null;
  district: string | null;
  vote: string | null;
}

export interface SanctionedLaw {
  law_number: string;
  project_id: string | null;
  sanctioning_chamber: string | null;
  initial_file: string | null;
  first_half_sanction: string | null;
  second_half_sanction: string | null;
  final_sanction: string | null;
  title: string | null;
  summary: string | null;
}

export interface BlocAttendance {
  chamber: Chamber;
  bloc: string;
  total_votes: number;
  present_votes: number;
  attendance_pct: string;
}

export interface Senator {
  senator_id: string;
  last_name: string | null;
  first_name: string | null;
  bloc: string | null;
  province: string | null;
  party: string | null;
  mandate_start: string | null;
  mandate_end: string | null;
}

export interface BlocSummary {
  bloc: string | null;
  count: number;
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

export interface CompoundInterestRequest {
  initial_capital: number;
  annual_rate: number;
  years: number;
  compounding_frequency: "MONTHLY" | "QUARTERLY" | "YEARLY";
  periodic_contribution?: number | undefined;
}

export interface CompoundInterestPeriod {
  period: number;
  principal: string;
  interest: string;
  total: string;
}

export interface CompoundInterestResponse {
  final_amount: string;
  total_contributions: string;
  total_interest: string;
  periods: CompoundInterestPeriod[];
}

export interface InflationAdjustmentRequest {
  amount: number;
  from_date: string;
  to_date: string;
}

export interface InflationAdjustmentResponse {
  original_amount: string;
  adjusted_amount: string;
  from_date: string;
  to_date: string;
  cumulative_inflation: string;
  months_elapsed: number;
}

export interface IncomeTaxRequest {
  gross_monthly_salary: number;
  retired?: boolean;
  health_insurance?: number | null;
  retirement?: number | null;
  union_dues?: number | null;
  union_dues_percent?: number | null;
  has_spouse?: boolean;
  number_of_children?: number;
  children_with_disabilities_count?: number;
  housing_rent?: number | null | undefined;
  domestic_service?: number | null;
  education_expenses?: number | null;
  life_insurance?: number | null;
}

export interface IncomeTaxScaleInfo {
  effective_from: string;
  period_label: string;
  source: string;
  source_url: string;
}

export interface IncomeTaxResponse {
  scale: IncomeTaxScaleInfo;
  gross_monthly_salary: string;
  gross_annual_salary: string;
  monthly_legal_deductions: string;
  total_deductions: string;
  taxable_income: string;
  annual_tax: string;
  monthly_tax: string;
  effective_rate: string;
  net_monthly_salary: string;
  calculation_details: Record<string, string>;
  deduction_breakdown: Record<string, string>;
  tax_brackets: Record<string, string | number>[];
}

export interface TaxImpactRequest {
  gross_monthly_salary: number;
  monthly_expenses: number;
  retired?: boolean;
  iibb_rate?: number;
}

export interface TaxImpactItem {
  concept: string;
  category: string;
  annual_amount: string;
  monthly_amount: string;
  share_of_income: string;
}

export interface TaxImpactResponse {
  gross_annual_income: string;
  annual_expenses: string;
  total_annual: string;
  total_monthly: string;
  total_pressure: string;
  days_for_the_state: number;
  tax_freedom_date: string;
  items: TaxImpactItem[];
}

async function get<T>(path: string, params?: object): Promise<T> {
  if (typeof window === "undefined") {
    return serverGet<T>(`${path}${buildQueryString(params)}`);
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
