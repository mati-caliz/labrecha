import { daysInMonth, monthlyRateToPerSecond, projectedValue, startOfCurrentMonth } from "@/lib/liveCounter";

const SECONDS_PER_DAY = 24 * 60 * 60;

describe("liveCounter", () => {
  describe("projectedValue", () => {
    it("adds the accumulated rate over elapsed seconds", () => {
      const since = 1_000_000;
      const now = since + 10_000;
      expect(projectedValue(0, 2, since, now)).toBe(20);
    });

    it("adds to the base value", () => {
      const since = 0;
      expect(projectedValue(100, 1, since, since + 5_000)).toBe(105);
    });

    it("never goes below the base value when now precedes since", () => {
      expect(projectedValue(50, 3, 10_000, 0)).toBe(50);
    });
  });

  describe("startOfCurrentMonth", () => {
    it("returns midnight of the first day of the reference month", () => {
      const start = startOfCurrentMonth(new Date(2026, 6, 19, 14, 30));
      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(6);
      expect(start.getDate()).toBe(1);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
    });
  });

  describe("daysInMonth", () => {
    it("counts days in a 31-day month", () => {
      expect(daysInMonth(new Date(2026, 6, 15))).toBe(31);
    });

    it("counts days in February of a leap year", () => {
      expect(daysInMonth(new Date(2024, 1, 10))).toBe(29);
    });

    it("counts days in February of a non-leap year", () => {
      expect(daysInMonth(new Date(2026, 1, 10))).toBe(28);
    });
  });

  describe("monthlyRateToPerSecond", () => {
    it("spreads a monthly value across the seconds of the month", () => {
      const days = 30;
      expect(monthlyRateToPerSecond(3, days)).toBeCloseTo(3 / (days * SECONDS_PER_DAY), 12);
    });

    it("returns zero when the month has no days", () => {
      expect(monthlyRateToPerSecond(3, 0)).toBe(0);
    });
  });
});
