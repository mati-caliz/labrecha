from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class IndicatorSourceSummary(BaseModel):
    source: str
    count: int
    first_date: date
    last_date: date
    latest_value: Decimal


class IndicatorSummary(BaseModel):
    indicator_code: str
    sources: list[str]
    count: int
    first_date: date
    last_date: date


class IndicatorPoint(BaseModel):
    date: date
    value: Decimal
    source: str
    meta: dict[str, Any]


class IndicatorSeries(BaseModel):
    indicator_code: str
    points: list[IndicatorPoint]


class RateOut(BaseModel):
    id: str
    name: str
    tna: Decimal
    tea: Decimal | None = None
    product: str
    updated_at: date | None = None
    details: dict[str, str | int | float] = {}
    link: str | None = None


class PoliticalEventOut(BaseModel):
    date: date
    title: str
    category: str
    description: str | None


class ScrapeRunOut(BaseModel):
    job_name: str
    status: str
    started_at: datetime
    finished_at: datetime | None
    rows_upserted: int
    error: str | None


class CongressVoteOut(BaseModel):
    vote_record_id: str
    chamber: str
    period_number: int | None
    session_type: str | None
    date: date | None
    title: str | None
    vote_type: str | None
    result: str | None
    president_name: str | None
    affirmative_votes: int | None
    negative_votes: int | None
    abstentions: int | None
    absents: int | None
    summary: str | None
    topic: str | None


class CongressVoteDetailOut(BaseModel):
    vote_record_id: str
    legislator_name: str | None
    bloc: str | None
    district: str | None
    vote: str | None


class RevenueSharingShareOut(BaseModel):
    province: str
    coefficient: Decimal
    share_pct: Decimal


class RentByNeighborhoodOut(BaseModel):
    neighborhood: str
    commune: str | None
    date: date
    price: Decimal
    rooms: str | None


class GazetteSummaryOut(BaseModel):
    regulation_id: str
    date: date
    section: str
    title: str
    summary: list[str]
    category: str
    url: str


class TaxChangeOut(BaseModel):
    regulation_id: str
    date: date
    change_type: str
    tax_name: str
    jurisdiction: str
    title: str
    url: str


class BlocAttendanceOut(BaseModel):
    chamber: str
    bloc: str
    total_votes: int
    present_votes: int
    attendance_pct: Decimal


class SanctionedLawOut(BaseModel):
    law_number: str
    project_id: str | None
    sanctioning_chamber: str | None
    initial_file: str | None
    first_half_sanction: date | None
    second_half_sanction: date | None
    final_sanction: date | None
    title: str | None
    summary: str | None


class SenatorOut(BaseModel):
    senator_id: str
    last_name: str | None
    first_name: str | None
    bloc: str | None
    province: str | None
    party: str | None
    mandate_start: date | None
    mandate_end: date | None


class BlocSummary(BaseModel):
    bloc: str | None
    count: int


class HolidayOut(BaseModel):
    date: date
    name: str
    local_name: str | None
    is_global: bool | None
    is_fixed: bool | None
    types: str | None


class NewsArticleOut(BaseModel):
    title: str
    summary: str
    source: str
    source_url: str
    category: str
    published_date: datetime
    image_url: str | None


class CompoundingFrequency(StrEnum):
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    YEARLY = "YEARLY"

    @property
    def periods_per_year(self) -> int:
        return {"MONTHLY": 12, "QUARTERLY": 4, "YEARLY": 1}[self.value]


class CompoundInterestRequest(BaseModel):
    initial_capital: Decimal = Field(gt=0)
    annual_rate: Decimal = Field(ge=0, le=200)
    years: int = Field(ge=1, le=50)
    compounding_frequency: CompoundingFrequency
    periodic_contribution: Decimal = Field(default=Decimal(0), ge=0)


class CompoundInterestPeriod(BaseModel):
    period: int
    principal: Decimal
    interest: Decimal
    total: Decimal


class CompoundInterestResponse(BaseModel):
    final_amount: Decimal
    total_contributions: Decimal
    total_interest: Decimal
    periods: list[CompoundInterestPeriod]


class InflationAdjustmentRequest(BaseModel):
    amount: Decimal = Field(gt=0)
    from_date: date
    to_date: date


class InflationAdjustmentResponse(BaseModel):
    original_amount: Decimal
    adjusted_amount: Decimal
    from_date: date
    to_date: date
    cumulative_inflation: Decimal
    months_elapsed: int


class CustomDeduction(BaseModel):
    concept: str
    amount: Decimal


class IncomeTaxRequest(BaseModel):
    gross_monthly_salary: Decimal = Field(gt=0)
    retired: bool = False
    health_insurance: Decimal | None = None
    retirement: Decimal | None = None
    union_dues: Decimal | None = None
    union_dues_percent: Decimal | None = None
    has_spouse: bool = False
    number_of_children: int = Field(default=0, ge=0)
    children_with_disabilities_count: int = Field(default=0, ge=0)
    housing_rent: Decimal | None = None
    domestic_service: Decimal | None = None
    education_expenses: Decimal | None = None
    life_insurance: Decimal | None = None
    donations: Decimal | None = None
    medical_fees: Decimal | None = None
    other_deductions: list[CustomDeduction] | None = None


class TaxImpactRequest(BaseModel):
    gross_monthly_salary: Decimal = Field(gt=0)
    monthly_expenses: Decimal = Field(ge=0)
    retired: bool = False
    iibb_rate: Decimal = Field(default=Decimal(4), ge=0, le=15)


class TaxImpactItem(BaseModel):
    concept: str
    category: str
    annual_amount: Decimal
    monthly_amount: Decimal
    share_of_income: Decimal


class TaxImpactResponse(BaseModel):
    gross_annual_income: Decimal
    annual_expenses: Decimal
    total_annual: Decimal
    total_monthly: Decimal
    total_pressure: Decimal
    days_for_the_state: int
    tax_freedom_date: date
    items: list[TaxImpactItem]


class TaxBracketOut(BaseModel):
    bracket: int
    from_amount: Decimal
    to_amount: Decimal
    rate: Decimal
    taxable_base: Decimal
    bracket_tax: Decimal


class IncomeTaxCalculationDetails(BaseModel):
    minimum_exemption: Decimal
    special_deduction: Decimal
    family_allowances: Decimal
    personal_deductions: Decimal
    total_allowed_deductions: Decimal


class IncomeTaxDeductionBreakdown(BaseModel):
    retirement: Decimal
    health_insurance: Decimal
    law_19032: Decimal
    union_dues: Decimal
    income_tax: Decimal
    total: Decimal


class IncomeTaxScaleInfo(BaseModel):
    effective_from: date
    period_label: str
    source: str
    source_url: str


class IncomeTaxResponse(BaseModel):
    scale: IncomeTaxScaleInfo
    gross_monthly_salary: Decimal
    gross_annual_salary: Decimal
    monthly_legal_deductions: Decimal
    total_deductions: Decimal
    taxable_income: Decimal
    annual_tax: Decimal
    monthly_tax: Decimal
    effective_rate: Decimal
    net_monthly_salary: Decimal
    calculation_details: IncomeTaxCalculationDetails
    deduction_breakdown: IncomeTaxDeductionBreakdown
    tax_brackets: list[TaxBracketOut]


class PostCategory(StrEnum):
    IDEA = "idea"
    LEY = "ley"
    ANALISIS = "analisis"
    NOTA = "nota"


class PostImpactKind(StrEnum):
    TIEMPO = "tiempo"
    DINERO = "dinero"
    AMBIENTE = "ambiente"
    VIDAS = "vidas"
    ESTADO = "estado"
    TRANSPARENCIA = "transparencia"


class PostImpact(BaseModel):
    kind: PostImpactKind
    value: str = Field(min_length=1, max_length=40)
    label: str = Field(min_length=1, max_length=200)


class PostOut(BaseModel):
    id: int
    slug: str
    title: str
    category: PostCategory
    summary: str | None
    content: str
    impacts: list[PostImpact] | None
    published: bool
    created_at: datetime
    updated_at: datetime


class PostCreate(BaseModel):
    slug: str = Field(min_length=1, max_length=160, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    title: str = Field(min_length=1, max_length=200)
    category: PostCategory
    summary: str | None = None
    content: str = Field(min_length=1)
    impacts: list[PostImpact] | None = None
    published: bool = False


class PostUpdate(BaseModel):
    slug: str | None = Field(
        default=None, min_length=1, max_length=160, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
    )
    title: str | None = Field(default=None, min_length=1, max_length=200)
    category: PostCategory | None = None
    summary: str | None = None
    content: str | None = Field(default=None, min_length=1)
    impacts: list[PostImpact] | None = None
    published: bool | None = None


class ErrorOrigin(StrEnum):
    API = "api"
    WEB_SERVER = "web-server"
    WEB_BROWSER = "web-browser"


class ErrorReportIn(BaseModel):
    origin: ErrorOrigin
    kind: str = Field(min_length=1, max_length=160)
    message: str = Field(min_length=1, max_length=2000)
    stack: str | None = Field(default=None, max_length=8000)
    path: str | None = Field(default=None, max_length=300)


class ErrorEventOut(BaseModel):
    fingerprint: str
    origin: str
    kind: str
    message: str
    stack: str | None
    path: str | None
    occurrences: int
    first_seen_at: datetime
    last_seen_at: datetime


class GapMeasurement(BaseModel):
    source: str
    value: Decimal


class GapExclusion(BaseModel):
    source: str
    reason: str


class GapOut(BaseModel):
    indicator_code: str
    date: date
    higher_source: str
    higher_value: Decimal
    lower_source: str
    lower_value: Decimal
    spread: Decimal
    gap_pct: float
    unit: str
    measurements: list[GapMeasurement]
    excluded_sources: list[GapExclusion] = []


class GapHistoryPoint(BaseModel):
    date: date
    higher_source: str
    lower_source: str
    spread: Decimal
    gap_pct: float
    sources: int


class GapHistoryOut(BaseModel):
    indicator_code: str
    unit: str
    points: list[GapHistoryPoint]
    widest: GapHistoryPoint
    narrowest: GapHistoryPoint
    latest: GapHistoryPoint


class TermMethod(StrEnum):
    COMPOUNDED = "COMPOUNDED"
    ENDPOINTS = "ENDPOINTS"


class IndicatorTermStat(BaseModel):
    term_id: str
    president: str
    start: date
    end: date | None
    first_date: date
    last_date: date
    first_value: Decimal
    last_value: Decimal
    average: Decimal
    points: int
    change_pct: Decimal
    annualized_pct: Decimal | None


class IndicatorTermsOut(BaseModel):
    indicator_code: str
    source: str
    method: TermMethod
    terms: list[IndicatorTermStat]


class IndicatorVariationOut(BaseModel):
    indicator_code: str
    source: str
    method: TermMethod
    requested_from: date
    first_date: date
    last_date: date
    first_value: Decimal
    last_value: Decimal
    points: int
    change_pct: Decimal
    annualized_pct: Decimal | None
