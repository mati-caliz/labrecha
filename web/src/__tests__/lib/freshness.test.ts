import {
  MAX_AGE_DAYS,
  TAX_SCALE_MAX_AGE_DAYS,
  daysSince,
  freshnessForCode,
  isTaxScaleOutdated,
} from "@/lib/freshness";

const TODAY = "2026-07-25";
const TODAY_MS = Date.UTC(2026, 6, 25);

describe("daysSince", () => {
  it("counts no days for today", () => {
    expect(daysSince(TODAY, TODAY_MS)).toBe(0);
  });

  it("counts the elapsed days", () => {
    expect(daysSince("2026-07-20", TODAY_MS)).toBe(5);
  });

  it("crosses months and years", () => {
    expect(daysSince("2025-07-25", TODAY_MS)).toBe(365);
  });

  it("ignores the time part of a timestamp", () => {
    expect(daysSince("2026-07-20T23:59:00Z", TODAY_MS)).toBe(5);
  });

  it("is negative for a date in the future", () => {
    expect(daysSince("2026-07-30", TODAY_MS)).toBe(-5);
  });
});

describe("freshnessForCode", () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(TODAY_MS);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("takes the cadence of the indicator", () => {
    expect(freshnessForCode("dollar_blue", TODAY).cadence).toBe("daily");
    expect(freshnessForCode("cpi_monthly", TODAY).cadence).toBe("monthly");
    expect(freshnessForCode("unemployment", TODAY).cadence).toBe("quarterly");
    expect(freshnessForCode("poverty_persons", TODAY).cadence).toBe("biannual");
    expect(freshnessForCode("big_mac_usd", TODAY).cadence).toBe("annual");
  });

  it("considers a daily indicator fresh right at its limit", () => {
    const limit = MAX_AGE_DAYS.daily;
    const lastDate = new Date(TODAY_MS - limit * 86_400_000).toISOString().slice(0, 10);

    const freshness = freshnessForCode("dollar_blue", lastDate);

    expect(freshness.days).toBe(limit);
    expect(freshness.stale).toBe(false);
  });

  it("marks a daily indicator stale one day past its limit", () => {
    const past = MAX_AGE_DAYS.daily + 1;
    const lastDate = new Date(TODAY_MS - past * 86_400_000).toISOString().slice(0, 10);

    expect(freshnessForCode("dollar_blue", lastDate).stale).toBe(true);
  });

  it("gives a monthly indicator more room than a daily one", () => {
    const lastDate = new Date(TODAY_MS - 30 * 86_400_000).toISOString().slice(0, 10);

    expect(freshnessForCode("dollar_blue", lastDate).stale).toBe(true);
    expect(freshnessForCode("cpi_monthly", lastDate).stale).toBe(false);
  });

  it("never marks today's data as stale, whatever the cadence", () => {
    for (const code of ["dollar_blue", "cpi_monthly", "unemployment", "big_mac_usd"]) {
      expect(freshnessForCode(code, TODAY).stale).toBe(false);
    }
  });

  it("orders the tolerated ages from the most to the least frequent cadence", () => {
    expect(MAX_AGE_DAYS.daily).toBeLessThan(MAX_AGE_DAYS.monthly);
    expect(MAX_AGE_DAYS.monthly).toBeLessThan(MAX_AGE_DAYS.quarterly);
    expect(MAX_AGE_DAYS.quarterly).toBeLessThan(MAX_AGE_DAYS.biannual);
    expect(MAX_AGE_DAYS.biannual).toBeLessThan(MAX_AGE_DAYS.annual);
  });
});

describe("isTaxScaleOutdated", () => {
  const dayInMs = 86_400_000;
  const dateDaysAgo = (days: number) => new Date(TODAY_MS - days * dayInMs).toISOString().slice(0, 10);

  it("trusts a scale that started within the semester", () => {
    expect(isTaxScaleOutdated(dateDaysAgo(TAX_SCALE_MAX_AGE_DAYS), TODAY_MS)).toBe(false);
  });

  it("warns about a scale older than the semester ARCA updates on", () => {
    expect(isTaxScaleOutdated(dateDaysAgo(TAX_SCALE_MAX_AGE_DAYS + 1), TODAY_MS)).toBe(true);
  });
});
