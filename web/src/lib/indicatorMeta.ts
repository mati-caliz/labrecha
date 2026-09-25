import { formatBillonesAR, formatMoneyAR, formatNumberAR, formatUsdAR } from "@/lib/numberFormat";

export type GoodWhen = "up" | "down" | "neutral";

export type IndicatorFamily = "precios" | "dolar" | "monetario" | "fiscal" | "empleo" | "social";

export const INDICATOR_FAMILY_LABELS: Record<IndicatorFamily, string> = {
  precios: "Precios e inflación",
  dolar: "Dólar y mercados",
  monetario: "Monetario y crédito",
  fiscal: "Fiscal e impuestos",
  empleo: "Empleo y actividad",
  social: "Social",
};

export const INDICATOR_FAMILY_ORDER: IndicatorFamily[] = [
  "precios",
  "dolar",
  "monetario",
  "fiscal",
  "empleo",
  "social",
];

export interface IndicatorMeta {
  label: string;
  family: IndicatorFamily;
  unit?: string;
  goodWhen?: GoodWhen;
  format: (value: number) => string;
}

const num0 = (value: number): string => formatNumberAR(value);
const num1 = (value: number): string => formatNumberAR(value, 1);
const num2 = (value: number): string => formatNumberAR(value, 2);
const money = (value: number): string => formatMoneyAR(value);
const billones = (value: number): string => formatBillonesAR(value);
const USD_CENTS_BELOW = 100;
const usd = (value: number): string => formatUsdAR(value, value < USD_CENTS_BELOW ? 2 : 0);

export const INDICATOR_META: Record<string, IndicatorMeta> = {
  cpi_monthly: {
    label: "Inflación mensual",
    family: "precios",
    unit: "%",
    goodWhen: "down",
    format: num1,
  },
  cpi_yoy: {
    label: "Inflación interanual",
    family: "precios",
    unit: "%",
    goodWhen: "down",
    format: num1,
  },
  cpi_level_general: { label: "IPC nivel general", family: "precios", unit: "pts", format: num1 },
  inflation_expectations_rem: {
    label: "Inflación esperada (REM)",
    family: "precios",
    unit: "%",
    goodWhen: "down",
    format: num1,
  },
  basic_basket_national: {
    label: "Canasta básica total",
    family: "precios",
    unit: "ARS",
    goodWhen: "down",
    format: money,
  },
  big_mac_ars: { label: "Big Mac (ARS)", family: "precios", unit: "ARS", format: money },
  big_mac_usd: {
    label: "Big Mac (USD)",
    family: "precios",
    unit: "USD",
    format: (value) => formatUsdAR(value, 2),
  },
  big_mac_valuation: {
    label: "Big Mac sub/sobrevaluación",
    family: "precios",
    unit: "%",
    format: num1,
  },

  dollar_official: {
    label: "Dólar oficial",
    family: "dolar",
    unit: "ARS",
    goodWhen: "down",
    format: money,
  },
  dollar_blue: {
    label: "Dólar blue",
    family: "dolar",
    unit: "ARS",
    goodWhen: "down",
    format: money,
  },
  dollar_mep: {
    label: "Dólar MEP (bolsa)",
    family: "dolar",
    unit: "ARS",
    goodWhen: "down",
    format: money,
  },
  dollar_ccl: {
    label: "Dólar contado con liqui",
    family: "dolar",
    unit: "ARS",
    goodWhen: "down",
    format: money,
  },
  dollar_crypto: {
    label: "Dólar cripto",
    family: "dolar",
    unit: "ARS",
    goodWhen: "down",
    format: money,
  },
  dollar_wholesale: {
    label: "Dólar mayorista",
    family: "dolar",
    unit: "ARS",
    goodWhen: "down",
    format: money,
  },
  dollar_card: {
    label: "Dólar tarjeta",
    family: "dolar",
    unit: "ARS",
    goodWhen: "down",
    format: money,
  },
  country_risk: {
    label: "Riesgo país",
    family: "dolar",
    unit: "pb",
    goodWhen: "down",
    format: num0,
  },
  crypto_btc: { label: "Bitcoin", family: "dolar", unit: "USD", format: usd },
  crypto_eth: { label: "Ethereum", family: "dolar", unit: "USD", format: usd },
  crypto_bnb: { label: "BNB", family: "dolar", unit: "USD", format: usd },
  crypto_xrp: { label: "XRP", family: "dolar", unit: "USD", format: usd },
  crypto_ada: { label: "Cardano", family: "dolar", unit: "USD", format: usd },
  crypto_sol: { label: "Solana", family: "dolar", unit: "USD", format: usd },

  international_reserves: {
    label: "Reservas internacionales",
    family: "monetario",
    unit: "USD M",
    goodWhen: "up",
    format: num0,
  },
  monetary_base: {
    label: "Base monetaria",
    family: "monetario",
    unit: "ARS",
    goodWhen: "down",
    format: billones,
  },
  private_sector_loans: {
    label: "Préstamos al sector privado",
    family: "monetario",
    unit: "ARS",
    goodWhen: "up",
    format: billones,
  },
  rate_tamar: { label: "Tasa TAMAR", family: "monetario", unit: "% TNA", format: num1 },
  rate_time_deposit: {
    label: "Plazo fijo minorista",
    family: "monetario",
    unit: "% TNA",
    goodWhen: "up",
    format: num1,
  },
  rate_personal_loans: {
    label: "Tasa préstamos personales",
    family: "monetario",
    unit: "% TNA",
    goodWhen: "down",
    format: num1,
  },
  rate_overdraft: {
    label: "Tasa adelantos cta. cte.",
    family: "monetario",
    unit: "% TNA",
    goodWhen: "down",
    format: num1,
  },
  icl: { label: "ICL (alquileres)", family: "monetario", unit: "índice", format: num2 },

  tax_revenue: {
    label: "Recaudación tributaria",
    family: "fiscal",
    unit: "ARS",
    goodWhen: "up",
    format: billones,
  },
  current_expenditure: {
    label: "Gasto corriente",
    family: "fiscal",
    unit: "ARS",
    goodWhen: "down",
    format: billones,
  },
  capital_expenditure: {
    label: "Gasto de capital",
    family: "fiscal",
    unit: "ARS",
    format: billones,
  },
  primary_balance: {
    label: "Resultado primario",
    family: "fiscal",
    unit: "ARS",
    goodWhen: "up",
    format: billones,
  },
  financial_balance: {
    label: "Resultado financiero",
    family: "fiscal",
    unit: "ARS",
    goodWhen: "up",
    format: billones,
  },
  energy_subsidies: {
    label: "Subsidios a la energía",
    family: "fiscal",
    unit: "ARS",
    goodWhen: "down",
    format: billones,
  },
  transport_subsidies: {
    label: "Subsidios al transporte",
    family: "fiscal",
    unit: "ARS",
    goodWhen: "down",
    format: billones,
  },
  taxes_total: {
    label: "Impuestos vigentes",
    family: "fiscal",
    unit: "tributos",
    goodWhen: "down",
    format: num0,
  },
  taxes_national: {
    label: "Impuestos nacionales",
    family: "fiscal",
    unit: "tributos",
    goodWhen: "down",
    format: num0,
  },
  taxes_provincial: {
    label: "Impuestos provinciales",
    family: "fiscal",
    unit: "tributos",
    goodWhen: "down",
    format: num0,
  },
  taxes_municipal: {
    label: "Impuestos municipales",
    family: "fiscal",
    unit: "tributos",
    goodWhen: "down",
    format: num0,
  },

  emae: {
    label: "Actividad económica (EMAE)",
    family: "empleo",
    unit: "pts",
    goodWhen: "up",
    format: num1,
  },
  industrial_production: {
    label: "Producción industrial (IPI)",
    family: "empleo",
    unit: "pts",
    goodWhen: "up",
    format: num1,
  },
  unemployment: { label: "Desempleo", family: "empleo", unit: "%", goodWhen: "down", format: num1 },
  informal_employment: {
    label: "Empleo no registrado",
    family: "empleo",
    unit: "%",
    goodWhen: "down",
    format: num1,
  },
  private_wage_employment: {
    label: "Empleo asalariado privado",
    family: "empleo",
    unit: "miles",
    goodWhen: "up",
    format: num0,
  },
  public_wage_employment: {
    label: "Empleo asalariado público",
    family: "empleo",
    unit: "miles",
    format: num0,
  },
  domestic_workers_employment: {
    label: "Empleo en casas particulares",
    family: "empleo",
    unit: "miles",
    format: num0,
  },
  self_employed_autonomous: {
    label: "Trabajadores autónomos",
    family: "empleo",
    unit: "miles",
    format: num0,
  },
  self_employed_monotax: {
    label: "Monotributistas",
    family: "empleo",
    unit: "miles",
    format: num0,
  },
  self_employed_social_monotax: {
    label: "Monotributistas sociales",
    family: "empleo",
    unit: "miles",
    format: num0,
  },
  ripte: { label: "Salario (RIPTE)", family: "empleo", unit: "ARS", goodWhen: "up", format: money },
  wage_index: {
    label: "Índice de salarios",
    family: "empleo",
    unit: "pts",
    goodWhen: "up",
    format: num1,
  },
  minimum_wage: {
    label: "Salario mínimo (SMVM)",
    family: "empleo",
    unit: "ARS",
    goodWhen: "up",
    format: money,
  },
  minimum_wage_real: {
    label: "Salario mínimo a precios constantes",
    family: "empleo",
    unit: "ARS",
    goodWhen: "up",
    format: money,
  },
  pension_minimum: {
    label: "Jubilación mínima",
    family: "social",
    unit: "ARS",
    goodWhen: "up",
    format: money,
  },
  pension_minimum_real: {
    label: "Jubilación mínima a precios constantes",
    family: "social",
    unit: "ARS",
    goodWhen: "up",
    format: money,
  },
  pension_beneficiaries: {
    label: "Jubilaciones y pensiones pagadas",
    family: "social",
    unit: "prestaciones",
    format: num0,
  },
  universal_child_allowance: {
    label: "Asignación Universal por Hijo",
    family: "social",
    unit: "ARS",
    goodWhen: "up",
    format: money,
  },
  implicit_fx_rate: {
    label: "Dólar de convertibilidad",
    family: "monetario",
    unit: "ARS",
    format: money,
  },

  poverty_persons: {
    label: "Pobreza",
    family: "social",
    unit: "%",
    goodWhen: "down",
    format: num1,
  },
  government_confidence: {
    label: "Confianza en el gobierno",
    family: "social",
    unit: "pts",
    goodWhen: "up",
    format: num2,
  },
};
