import {
  type IndicatorDisplay,
  formatDateAR,
  formatNumberAR,
  getIndicatorDisplay,
  sourceLabel,
} from "@/lib/indicators";
import type { IndicatorSourceSummary, SourceGap } from "@/lib/labrechaApi";
import { orderIndicatorSources } from "@/lib/series";

const CURRENCY_UNITS = new Set(["ARS", "USD", "USD M"]);

function unitSuffix(unit: string | undefined, formatted: string): string {
  if (unit === undefined || CURRENCY_UNITS.has(unit)) {
    return "";
  }
  if (formatted.endsWith(unit)) {
    return "";
  }
  return unit.startsWith("%") ? unit : ` ${unit}`;
}

export function formatIndicatorValue(indicator: IndicatorDisplay, value: number): string {
  const formatted = indicator.format(value);
  return `${formatted}${unitSuffix(indicator.unit, formatted)}`;
}

export function indicatorDescription(indicator: IndicatorDisplay, sources: IndicatorSourceSummary[]): string {
  const [primary, ...rest] = orderIndicatorSources(sources, indicator.preferredSource);
  if (primary === undefined) {
    return `Serie histórica de ${indicator.label} en Argentina, con su fuente, fecha y eventos políticos.`;
  }
  const value = Number.parseFloat(primary.latest_value);
  const headline = Number.isFinite(value)
    ? `${indicator.label}: ${formatIndicatorValue(indicator, value)} al ${formatDateAR(primary.last_date)} según ${sourceLabel(primary.source)}.`
    : `${indicator.label} en Argentina, medido por ${sourceLabel(primary.source)}.`;
  const comparison =
    rest.length === 0
      ? ""
      : ` Comparado con ${rest.map((source) => sourceLabel(source.source)).join(" y ")} para ver la brecha entre mediciones.`;
  return `${headline} Serie histórica anotada con eventos políticos, con su fuente y fecha a la vista.${comparison}`;
}

const GAPS_BASE_DESCRIPTION =
  "El mismo indicador medido por fuentes distintas: dos series superpuestas con su discrepancia, fuente y fecha.";
const GAP_PCT_DECIMALS = 1;

export function gapsDescription(gaps: SourceGap[]): string {
  const ranked = gaps.filter((gap) => Number.isFinite(gap.gap_pct));
  const top = ranked[0];
  if (top === undefined) {
    return GAPS_BASE_DESCRIPTION;
  }
  const label = getIndicatorDisplay(top.indicator_code).label;
  const spread = `${formatNumberAR(Math.abs(top.gap_pct), GAP_PCT_DECIMALS)} %`;
  const headline = `La mayor discrepancia hoy es ${label}: ${spread} entre ${sourceLabel(top.higher_source)} y ${sourceLabel(top.lower_source)} al ${formatDateAR(top.date)}.`;
  const total =
    ranked.length === 1
      ? ""
      : ` ${ranked.length} indicadores medidos por más de una fuente, rankeados por discrepancia.`;
  return `${headline}${total} ${GAPS_BASE_DESCRIPTION}`;
}
