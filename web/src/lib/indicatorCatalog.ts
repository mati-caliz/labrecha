import { type GoodWhen, type IndicatorMeta, INDICATOR_META } from "@/lib/indicatorMeta";
import { formatMoneyAR, formatNumberAR } from "@/lib/numberFormat";

export * from "@/lib/indicatorMeta";

export type VariationMode = "pct" | "delta" | "none";

export interface IndicatorDisplay {
  code: string;
  label: string;
  unit?: string;
  href: string;
  goodWhen: GoodWhen;
  preferredSource?: string;
  historySource?: string;
  format: (value: number) => string;
  variation: VariationMode;
  variationSuffix?: string;
  sparkPoints: number;
}

export const SOURCE_LABELS: Record<string, string> = {
  bcra: "BCRA",
  datosgobar: "datos.gob.ar",
  argentinadatos: "Argentina Datos",
  dolarapi: "DolarAPI",
  coingecko: "CoinGecko",
  utdt: "UTDT",
  labrecha: "La Brecha (calculado)",
  iaraf: "IARAF",
  hcdn: "HCDN",
  iec_caba: "IEC (CABA)",
  dgeyc_cordoba: "DGEyC (Córdoba)",
  deie_mendoza: "DEIE (Mendoza)",
  dpec_neuquen: "DPEyC (Neuquén)",
  dpec_san_luis: "DPEyC (San Luis)",
  ipec_santa_fe: "IPEC (Santa Fe)",
  de_tucuman: "DE (Tucumán)",
  ipecd_chaco: "IPECD (Chaco)",
};

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

export const PERIOD_LABELS: Record<string, string> = {
  dollar_official: "diario",
  dollar_blue: "diario",
  country_risk: "diario",
  international_reserves: "diario",
  cpi_monthly: "mensual",
  cpi_yoy: "mensual",
  poverty_persons: "semestral",
  unemployment: "trimestral",
  government_confidence: "mensual",
};

export const FEATURED_INDICATOR_CODES = [
  "dollar_official",
  "dollar_blue",
  "cpi_monthly",
  "country_risk",
  "international_reserves",
  "cpi_yoy",
  "poverty_persons",
  "unemployment",
  "government_confidence",
] as const;

export const FEATURED_INDICATORS: IndicatorDisplay[] = [
  {
    code: "dollar_official",
    label: "Dólar oficial",
    unit: "ARS",
    href: "/indicador/dollar_official",
    goodWhen: "down",
    preferredSource: "dolarapi",
    historySource: "argentinadatos",
    format: (value) => formatMoneyAR(value),
    variation: "pct",
    sparkPoints: 30,
  },
  {
    code: "dollar_blue",
    label: "Dólar blue",
    unit: "ARS",
    href: "/indicador/dollar_blue",
    goodWhen: "down",
    preferredSource: "dolarapi",
    historySource: "argentinadatos",
    format: (value) => formatMoneyAR(value),
    variation: "pct",
    sparkPoints: 30,
  },
  {
    code: "cpi_monthly",
    label: "Inflación mensual",
    unit: "%",
    href: "/indicador/cpi_monthly",
    goodWhen: "down",
    preferredSource: "argentinadatos",
    format: (value) => formatNumberAR(value, 1),
    variation: "delta",
    variationSuffix: " pp",
    sparkPoints: 24,
  },
  {
    code: "country_risk",
    label: "Riesgo país",
    unit: "pb",
    href: "/indicador/country_risk",
    goodWhen: "down",
    preferredSource: "argentinadatos",
    format: (value) => formatNumberAR(value),
    variation: "pct",
    sparkPoints: 60,
  },
  {
    code: "international_reserves",
    label: "Reservas internacionales",
    unit: "USD M",
    href: "/indicador/international_reserves",
    goodWhen: "up",
    preferredSource: "bcra",
    format: (value) => formatNumberAR(value),
    variation: "pct",
    sparkPoints: 60,
  },
  {
    code: "cpi_yoy",
    label: "Inflación interanual",
    unit: "%",
    href: "/indicador/cpi_yoy",
    goodWhen: "down",
    preferredSource: "argentinadatos",
    format: (value) => formatNumberAR(value, 1),
    variation: "delta",
    variationSuffix: " pp",
    sparkPoints: 24,
  },
  {
    code: "poverty_persons",
    label: "Pobreza",
    unit: "%",
    href: "/indicador/poverty_persons",
    goodWhen: "down",
    preferredSource: "datosgobar",
    format: (value) => formatNumberAR(value, 1),
    variation: "delta",
    variationSuffix: " pp",
    sparkPoints: 12,
  },
  {
    code: "unemployment",
    label: "Desempleo",
    unit: "%",
    href: "/indicador/unemployment",
    goodWhen: "down",
    preferredSource: "datosgobar",
    format: (value) => formatNumberAR(value, 1),
    variation: "delta",
    variationSuffix: " pp",
    sparkPoints: 16,
  },
  {
    code: "government_confidence",
    label: "Confianza en el gobierno",
    unit: "pts",
    href: "/indicador/government_confidence",
    goodWhen: "up",
    preferredSource: "utdt",
    format: (value) => formatNumberAR(value, 2),
    variation: "delta",
    variationSuffix: " pts",
    sparkPoints: 24,
  },
];

export const INDICATOR_BY_CODE: Record<string, IndicatorDisplay> = Object.fromEntries(
  FEATURED_INDICATORS.map((indicator) => [indicator.code, indicator]),
);

export type Cadence = "daily" | "monthly" | "quarterly" | "biannual" | "annual";

export const CADENCE_LABELS: Record<Cadence, string> = {
  daily: "diaria",
  monthly: "mensual",
  quarterly: "trimestral",
  biannual: "semestral",
  annual: "anual",
};

const CADENCE_DAILY_EXTRA = new Set([
  "international_reserves",
  "implicit_fx_rate",
  "monetary_base",
  "rate_tamar",
  "rate_time_deposit",
  "rate_personal_loans",
  "rate_overdraft",
  "private_sector_loans",
  "icl",
]);
const CADENCE_QUARTERLY = new Set(["unemployment", "informal_employment"]);
const CADENCE_BIANNUAL = new Set(["poverty_persons"]);
const CADENCE_ANNUAL = new Set([
  "big_mac_ars",
  "big_mac_usd",
  "big_mac_valuation",
  "taxes_total",
  "taxes_national",
  "taxes_provincial",
  "taxes_municipal",
]);

export function cadenceForCode(code: string): Cadence {
  if (CADENCE_ANNUAL.has(code)) {
    return "annual";
  }
  if (CADENCE_BIANNUAL.has(code)) {
    return "biannual";
  }
  if (CADENCE_QUARTERLY.has(code)) {
    return "quarterly";
  }
  if (CADENCE_DAILY_EXTRA.has(code) || INDICATOR_META[code]?.family === "dolar") {
    return "daily";
  }
  return "monthly";
}

export function getIndicatorMeta(code: string): IndicatorMeta | undefined {
  return INDICATOR_META[code];
}

export function indicatorLabel(code: string): string {
  return INDICATOR_META[code]?.label ?? INDICATOR_BY_CODE[code]?.label ?? code;
}

export function getIndicatorDisplay(code: string): IndicatorDisplay {
  const featured = INDICATOR_BY_CODE[code];
  if (featured) {
    return featured;
  }
  const meta = INDICATOR_META[code];
  return {
    code,
    label: meta?.label ?? code,
    ...(meta?.unit === undefined ? {} : { unit: meta.unit }),
    href: `/indicador/${code}`,
    goodWhen: meta?.goodWhen ?? "down",
    format: meta?.format ?? ((value) => formatNumberAR(value, 2)),
    variation: "pct",
    sparkPoints: 60,
  };
}

export const SOURCE_METHODOLOGY: Record<string, string> = {
  bcra: "Serie diaria oficial del BCRA (reservas internacionales, variable monetaria).",
  datosgobar:
    "Serie publicada en el portal datos.gob.ar a partir de fuentes oficiales (INDEC, BCRA, Ministerio de Economía).",
  argentinadatos:
    "Datos históricos compilados por Argentina Datos a partir de publicaciones oficiales del INDEC y el mercado.",
  dolarapi: "Cotización de referencia publicada por DolarAPI.",
  coingecko: "Precio de mercado informado por CoinGecko.",
  utdt: "Índice de Confianza en el Gobierno (ICG) de la Escuela de Gobierno de la UTDT, escala 0 a 5.",
  labrecha:
    "Serie calculada por nosotros a partir de otras dos que sí son de fuente oficial; el detalle del cálculo está en la metadata de cada dato y en /metodologia.",
};

export const DEFAULT_RANGE = "1A";

export const RANGE_MONTHS: Record<string, number> = {
  "1M": 1,
  "6M": 6,
  "1A": 12,
  "5A": 60,
  Máx: Number.POSITIVE_INFINITY,
};
