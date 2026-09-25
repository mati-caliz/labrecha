import { getIndicatorDisplay } from "@/lib/indicators";
import type { IndicatorSourceSummary, SourceGap } from "@/lib/labrechaApi";
import { gapsDescription, indicatorDescription } from "@/lib/seoDescriptions";

function source(overrides: Partial<IndicatorSourceSummary> = {}): IndicatorSourceSummary {
  return {
    source: "dolarapi",
    count: 400,
    first_date: "2024-01-01",
    last_date: "2026-07-25",
    latest_value: "1520.5",
    ...overrides,
  };
}

function gap(overrides: Partial<SourceGap> = {}): SourceGap {
  return {
    indicator_code: "international_reserves",
    date: "2026-07-24",
    higher_source: "bcra",
    higher_value: "42000",
    lower_source: "datosgobar",
    lower_value: "40000",
    spread: "2000",
    gap_pct: 5,
    unit: "USD M",
    measurements: [],
    excluded_sources: [],
    ...overrides,
  };
}

describe("indicatorDescription", () => {
  it("puts the current value, its date and its source in the snippet", () => {
    const description = indicatorDescription(getIndicatorDisplay("dollar_blue"), [source()]);

    expect(description).toContain("$ 1.521");
    expect(description).toContain("25/07/2026");
    expect(description).toContain("DolarAPI");
  });

  it("appends a non-currency unit to the number", () => {
    const description = indicatorDescription(getIndicatorDisplay("cpi_monthly"), [
      source({ source: "datosgobar", latest_value: "2.4" }),
    ]);

    expect(description).toContain("2,4%");
  });

  it("names the other sources so the snippet shows there is a gap to compare", () => {
    const description = indicatorDescription(getIndicatorDisplay("international_reserves"), [
      source({ source: "bcra", count: 500 }),
      source({ source: "datosgobar", count: 100 }),
    ]);

    expect(description).toContain("datos.gob.ar");
    expect(description).toContain("brecha entre mediciones");
  });

  it("falls back to the generic description when the indicator has no data", () => {
    const description = indicatorDescription(getIndicatorDisplay("dollar_blue"), []);

    expect(description).toContain("Serie histórica");
    expect(description).not.toContain("undefined");
    expect(description).not.toContain("NaN");
  });

  it("never prints NaN when the latest value is not a number", () => {
    const description = indicatorDescription(getIndicatorDisplay("dollar_blue"), [
      source({ latest_value: "" }),
    ]);

    expect(description).not.toContain("NaN");
    expect(description).toContain("DolarAPI");
  });
});

describe("gapsDescription", () => {
  it("leads with the widest discrepancy, its sources and its date", () => {
    const description = gapsDescription([gap()]);

    expect(description).toContain("5,0 %");
    expect(description).toContain("BCRA");
    expect(description).toContain("datos.gob.ar");
    expect(description).toContain("24/07/2026");
  });

  it("counts how many indicators have more than one source", () => {
    const description = gapsDescription([gap(), gap({ indicator_code: "cpi_monthly", gap_pct: 2 })]);

    expect(description).toContain("2 indicadores");
  });

  it("keeps the generic description when there is no automatic gap yet", () => {
    expect(gapsDescription([])).not.toContain("discrepancia hoy");
  });
});
