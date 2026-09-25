import { formatMoneyAR, formatNumberAR } from "@/lib/indicators";

export type GapMode = "pct" | "pp";

export interface GapLeg {
  code: string;
  source: string;
  historySource?: string;
  label: string;
}

export interface GapDef {
  id: string;
  label: string;
  subtitle: string;
  unit?: string;
  format: (value: number) => string;
  gapMode: GapMode;
  narrowIsGood: boolean;
  legs: [GapLeg, GapLeg];
}

export const GAPS: GapDef[] = [
  {
    id: "cambiaria",
    label: "Brecha cambiaria (blue)",
    subtitle: "Dólar blue frente al oficial",
    unit: "ARS",
    format: (value) => formatMoneyAR(value),
    gapMode: "pct",
    narrowIsGood: true,
    legs: [
      { code: "dollar_blue", source: "dolarapi", historySource: "argentinadatos", label: "Blue" },
      {
        code: "dollar_official",
        source: "dolarapi",
        historySource: "argentinadatos",
        label: "Oficial",
      },
    ],
  },
  {
    id: "financiera",
    label: "Brecha financiera (MEP)",
    subtitle: "Dólar MEP (bolsa) frente al oficial",
    unit: "ARS",
    format: (value) => formatMoneyAR(value),
    gapMode: "pct",
    narrowIsGood: true,
    legs: [
      { code: "dollar_mep", source: "dolarapi", historySource: "argentinadatos", label: "MEP" },
      {
        code: "dollar_official",
        source: "dolarapi",
        historySource: "argentinadatos",
        label: "Oficial",
      },
    ],
  },
  {
    id: "inflacion-esperada",
    label: "Inflación esperada vs. medida",
    subtitle: "Expectativa del REM (12m) frente a la inflación interanual medida",
    unit: "%",
    format: (value) => formatNumberAR(value, 1),
    gapMode: "pp",
    narrowIsGood: false,
    legs: [
      { code: "inflation_expectations_rem", source: "datosgobar", label: "Esperada (REM 12m)" },
      { code: "cpi_yoy", source: "argentinadatos", label: "Medida (interanual)" },
    ],
  },
  {
    id: "reservas",
    label: "Reservas: BCRA vs. datos.gob.ar",
    subtitle: "La misma serie medida por dos fuentes oficiales",
    unit: "USD M",
    format: (value) => formatNumberAR(value),
    gapMode: "pct",
    narrowIsGood: false,
    legs: [
      { code: "international_reserves", source: "bcra", label: "BCRA (diaria)" },
      { code: "international_reserves", source: "datosgobar", label: "datos.gob.ar (mensual)" },
    ],
  },
];

export const GAP_BY_ID: Record<string, GapDef> = Object.fromEntries(GAPS.map((gap) => [gap.id, gap]));

export const PERCENT_UNIT = "%";

const PP_BAR_FULL_SCALE = 10;
const PCT_BAR_FULL_SCALE = 100;
const PERCENT_FACTOR = 100;

function barWidthForPoints(points: number): number {
  return Math.min((points / PP_BAR_FULL_SCALE) * PCT_BAR_FULL_SCALE, PCT_BAR_FULL_SCALE);
}

export interface GapResult {
  gapPct: number;
  gapValue: number;
  formattedGap: string;
  magnitude: number;
  barWidth: number;
}

export function computeGap(def: GapDef, valueA: number, valueB: number): GapResult {
  const gapValue = valueA - valueB;
  const gapPct = valueB !== 0 ? (gapValue / Math.abs(valueB)) * PERCENT_FACTOR : 0;
  const points = Math.abs(gapValue);
  const relative = Math.abs(gapPct);
  const measuredInPoints = def.gapMode === "pp";
  return {
    gapPct,
    gapValue,
    formattedGap: measuredInPoints ? `${formatNumberAR(points, 1)} pp` : `${formatNumberAR(relative, 1)} %`,
    magnitude: measuredInPoints ? points : relative,
    barWidth: measuredInPoints ? barWidthForPoints(points) : Math.min(relative, PCT_BAR_FULL_SCALE),
  };
}

export interface AutomaticGapMagnitude {
  headline: string;
  caption: string;
  barWidth: number;
}

export function automaticGapMagnitude(unit: string, spread: number, gapPct: number): AutomaticGapMagnitude {
  if (unit === PERCENT_UNIT) {
    const points = Math.abs(spread);
    return {
      headline: `${formatNumberAR(points, 2)} pp`,
      caption: "entre la medición más alta y la más baja",
      barWidth: barWidthForPoints(points),
    };
  }
  const relative = Math.abs(gapPct);
  return {
    headline: `${formatNumberAR(relative, 2)} %`,
    caption: "de discrepancia",
    barWidth: Math.min(relative, PCT_BAR_FULL_SCALE),
  };
}
