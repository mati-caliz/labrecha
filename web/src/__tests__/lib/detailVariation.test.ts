import {
  gapPercent,
  variationVsMonthsAgo,
  variationVsPreviousPoint,
} from "@/components/indicator/detail/variation";
import { getIndicatorDisplay } from "@/lib/indicators";
import type { ParsedPoint } from "@/lib/series";

const BLUE = getIndicatorDisplay("dollar_blue");
const CPI = getIndicatorDisplay("cpi_monthly");

function points(...pairs: [string, number][]): ParsedPoint[] {
  return pairs.map(([date, value]) => ({ date, value }));
}

describe("variationVsPreviousPoint", () => {
  it("compara el último dato con el anterior en porcentaje", () => {
    const variation = variationVsPreviousPoint(BLUE, points(["2026-07-24", 1000], ["2026-07-25", 1100]));

    expect(variation?.text).toBe("▲ 10,0%");
  });

  it("usa la diferencia en puntos cuando el indicador ya es una tasa", () => {
    const variation = variationVsPreviousPoint(CPI, points(["2026-05-01", 2], ["2026-06-01", 2.5]));

    expect(variation?.text).toBe("▲ 0,5 pp");
  });

  it("no inventa una variación con un solo dato", () => {
    expect(variationVsPreviousPoint(BLUE, points(["2026-07-25", 1000]))).toBeUndefined();
    expect(variationVsPreviousPoint(BLUE, [])).toBeUndefined();
  });

  it("no divide por cero cuando la base es cero", () => {
    expect(variationVsPreviousPoint(BLUE, points(["2026-07-24", 0], ["2026-07-25", 1100]))).toBeUndefined();
  });

  it("marca como bueno que baje un indicador que conviene bajo", () => {
    const down = variationVsPreviousPoint(BLUE, points(["2026-07-24", 1100], ["2026-07-25", 1000]));
    const up = variationVsPreviousPoint(BLUE, points(["2026-07-24", 1000], ["2026-07-25", 1100]));

    expect(down?.color).toBe("var(--pos)");
    expect(up?.color).toBe("var(--neg)");
  });
});

describe("variationVsMonthsAgo", () => {
  it("toma como base el último dato anterior a la fecha buscada", () => {
    const variation = variationVsMonthsAgo(
      BLUE,
      points(["2026-05-20", 800], ["2026-06-25", 1000], ["2026-07-25", 1200]),
      1,
    );

    expect(variation?.text).toBe("▲ 20,0%");
  });

  it("no compara contra nada cuando la serie no llega tan atrás", () => {
    expect(variationVsMonthsAgo(BLUE, points(["2026-07-25", 1200]), 12)).toBeUndefined();
  });
});

describe("gapPercent", () => {
  it("mide la discrepancia sobre el valor absoluto más grande", () => {
    expect(gapPercent(120, 100)).toBeCloseTo(16.6667, 3);
  });

  it("no calcula brecha si falta una de las dos patas", () => {
    expect(gapPercent(120, undefined)).toBeUndefined();
    expect(gapPercent(null, 100)).toBeUndefined();
  });

  it("no divide por cero cuando las dos patas son cero", () => {
    expect(gapPercent(0, 0)).toBe(0);
  });
});
