import type { IndicatorPoint, PoliticalEvent } from "@/lib/labrechaApi";
import {
  alignSources,
  eventsToChartEvents,
  latestSourceDate,
  mergePoints,
  orderIndicatorSources,
  parsePoints,
  rangeDateFrom,
  yearLabels,
} from "@/lib/series";

function apiPoint(date: string, value: string, source = "bcra"): IndicatorPoint {
  return { date, value, source, meta: {} };
}

function event(date: string, title: string): PoliticalEvent {
  return { date, title, category: "eleccion", description: null };
}

describe("parsePoints", () => {
  it("converts the API strings into numbers", () => {
    const parsed = parsePoints([apiPoint("2024-01-01", "12.5")]);

    expect(parsed).toEqual([{ date: "2024-01-01", value: 12.5 }]);
  });

  it("sorts the points chronologically", () => {
    const parsed = parsePoints([
      apiPoint("2024-03-01", "3"),
      apiPoint("2024-01-01", "1"),
      apiPoint("2024-02-01", "2"),
    ]);

    expect(parsed.map((point) => point.date)).toEqual(["2024-01-01", "2024-02-01", "2024-03-01"]);
  });

  it("drops the points whose value is not a number", () => {
    const parsed = parsePoints([apiPoint("2024-01-01", "sin dato"), apiPoint("2024-02-01", "2")]);

    expect(parsed).toEqual([{ date: "2024-02-01", value: 2 }]);
  });

  it("returns nothing for an empty series", () => {
    expect(parsePoints([])).toEqual([]);
  });
});

describe("mergePoints", () => {
  it("keeps both series ordered by date", () => {
    const merged = mergePoints([{ date: "2024-01-01", value: 1 }], [{ date: "2024-02-01", value: 2 }]);

    expect(merged).toEqual([
      { date: "2024-01-01", value: 1 },
      { date: "2024-02-01", value: 2 },
    ]);
  });

  it("lets the live value win over the historical one on the same date", () => {
    const merged = mergePoints([{ date: "2024-01-01", value: 1 }], [{ date: "2024-01-01", value: 99 }]);

    expect(merged).toEqual([{ date: "2024-01-01", value: 99 }]);
  });
});

describe("alignSources", () => {
  it("builds the axis from the union of every source date", () => {
    const aligned = alignSources([
      { source: "bcra", points: [{ date: "2024-01-01", value: 1 }] },
      { source: "datosgobar", points: [{ date: "2024-02-01", value: 2 }] },
    ]);

    expect(aligned.axis).toEqual(["2024-01-01", "2024-02-01"]);
    expect(aligned.lines.map((line) => line.source)).toEqual(["bcra", "datosgobar"]);
  });

  it("gives every line one value per axis entry", () => {
    const aligned = alignSources([
      {
        source: "bcra",
        points: [
          { date: "2024-01-01", value: 1 },
          { date: "2024-03-01", value: 3 },
        ],
      },
      { source: "datosgobar", points: [{ date: "2024-02-01", value: 2 }] },
    ]);

    for (const line of aligned.lines) {
      expect(line.data).toHaveLength(aligned.axis.length);
    }
  });

  it("carries the last known value forward until the next measurement", () => {
    const aligned = alignSources([
      {
        source: "bcra",
        points: [
          { date: "2024-01-01", value: 10 },
          { date: "2024-03-01", value: 30 },
        ],
      },
      { source: "datosgobar", points: [{ date: "2024-02-01", value: 20 }] },
    ]);

    expect(aligned.lines[0]?.data).toEqual([10, 10, 30]);
  });

  it("downsamples long series while keeping the first and last dates", () => {
    const dayInMs = 86_400_000;
    const start = Date.UTC(2024, 0, 1);
    const points = Array.from({ length: 100 }, (_, index) => ({
      date: new Date(start + index * dayInMs).toISOString().slice(0, 10),
      value: index,
    }));

    const aligned = alignSources([{ source: "bcra", points }], 10);

    expect(aligned.axis).toHaveLength(10);
    expect(aligned.axis[0]).toBe(points[0]?.date);
    expect(aligned.axis[aligned.axis.length - 1]).toBe(points[points.length - 1]?.date);
  });

  it("returns an empty axis when there are no sources", () => {
    expect(alignSources([])).toEqual({ axis: [], lines: [] });
  });

  it("leaves a hole before the first measurement instead of backfilling it", () => {
    const aligned = alignSources([
      { source: "bcra", points: [{ date: "2024-01-01", value: 10 }] },
      { source: "datosgobar", points: [{ date: "2024-03-01", value: 30 }] },
    ]);

    expect(aligned.lines[1]?.data).toEqual([null, 30]);
  });

  it("fills a source without points with nulls, never with zeros", () => {
    const aligned = alignSources([
      { source: "bcra", points: [{ date: "2024-01-01", value: 10 }] },
      { source: "datosgobar", points: [] },
    ]);

    expect(aligned.lines[1]?.data).toEqual([null]);
  });

  it("keeps a source out of the axis stretch measured only by the other one", () => {
    const aligned = alignSources([
      {
        source: "bcra",
        points: [
          { date: "2024-01-01", value: 10 },
          { date: "2024-02-01", value: 20 },
        ],
      },
      {
        source: "datosgobar",
        points: [
          { date: "2024-03-01", value: 30 },
          { date: "2024-04-01", value: 40 },
        ],
      },
    ]);

    expect(aligned.lines[1]?.data.slice(0, 2)).toEqual([null, null]);
    expect(
      aligned.axis.filter(
        (_date, index) => aligned.lines[0]?.data[index] !== null && aligned.lines[1]?.data[index] !== null,
      ),
    ).toEqual(["2024-03-01", "2024-04-01"]);
  });
});

describe("eventsToChartEvents", () => {
  const axis = ["2024-01-01", "2024-02-01", "2024-03-01"];

  it("anchors the event to the closest date of the axis", () => {
    const chartEvents = eventsToChartEvents(axis, [event("2024-02-02", "PASO")]);

    expect(chartEvents).toEqual([{ index: 1, label: "PASO" }]);
  });

  it("drops the events outside the visible range", () => {
    const chartEvents = eventsToChartEvents(axis, [
      event("2020-01-01", "Anterior"),
      event("2030-01-01", "Posterior"),
    ]);

    expect(chartEvents).toEqual([]);
  });

  it("has nothing to anchor on an empty axis", () => {
    expect(eventsToChartEvents([], [event("2024-01-01", "PASO")])).toEqual([]);
  });
});

describe("yearLabels", () => {
  it("labels one position per year without repeating it", () => {
    const axis = ["2022-01-01", "2022-06-01", "2023-01-01", "2023-06-01", "2024-01-01"];

    const labels = yearLabels(axis, 5);

    expect(labels.filter(Boolean)).toEqual(["2022", "2023", "2024"]);
  });

  it("returns one entry per axis position", () => {
    const axis = ["2022-01-01", "2023-01-01"];

    expect(yearLabels(axis)).toHaveLength(axis.length);
  });

  it("handles an empty axis", () => {
    expect(yearLabels([])).toEqual([]);
  });
});

describe("rangeDateFrom", () => {
  it("goes back the requested number of months", () => {
    expect(rangeDateFrom("2024-06-15", 3)).toBe("2024-03-15");
  });

  it("crosses the year boundary", () => {
    expect(rangeDateFrom("2024-02-15", 3)).toBe("2023-11-15");
  });

  it("has no start date when there is no latest date", () => {
    expect(rangeDateFrom(undefined, 3)).toBeUndefined();
  });

  it("has no start date for a non finite range", () => {
    expect(rangeDateFrom("2024-06-15", Number.POSITIVE_INFINITY)).toBeUndefined();
  });
});

describe("orderIndicatorSources", () => {
  const sources = [
    { source: "datosgobar", count: 10 },
    { source: "bcra", count: 100 },
  ];

  it("puts the preferred source first", () => {
    const ordered = orderIndicatorSources(sources, "datosgobar");

    expect(ordered.map((source) => source.source)).toEqual(["datosgobar", "bcra"]);
  });

  it("falls back to the source with most points", () => {
    const ordered = orderIndicatorSources(sources, undefined);

    expect(ordered.map((source) => source.source)).toEqual(["bcra", "datosgobar"]);
  });

  it("does not mutate the received list", () => {
    orderIndicatorSources(sources, "datosgobar");

    expect(sources.map((source) => source.source)).toEqual(["datosgobar", "bcra"]);
  });
});

describe("latestSourceDate", () => {
  it("takes the most recent date across sources", () => {
    expect(latestSourceDate([{ last_date: "2024-01-01" }, { last_date: "2024-05-01" }])).toBe("2024-05-01");
  });

  it("returns an empty string when there are no sources", () => {
    expect(latestSourceDate([])).toBe("");
  });
});
