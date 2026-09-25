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
