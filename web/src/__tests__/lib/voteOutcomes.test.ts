import { INDICATOR_META } from "@/lib/indicators";
import { VOTE_OUTCOMES, voteOutcomesFor } from "@/lib/voteOutcomes";

const MIN_CURATED_VOTES = 3;
const MIN_READING_LENGTH = 80;

describe("catálogo curado de lo votado y lo que pasó", () => {
  it("tiene al menos tres votaciones curadas", () => {
    const votes = new Set(VOTE_OUTCOMES.map((outcome) => outcome.voteRecordId));

    expect(votes.size).toBeGreaterThanOrEqual(MIN_CURATED_VOTES);
  });

  it("apunta siempre a un indicador que existe en el catálogo", () => {
    for (const outcome of VOTE_OUTCOMES) {
      expect(INDICATOR_META[outcome.indicatorCode]).toBeDefined();
    }
  });

  it("no repite el par votación + indicador", () => {
    const pairs = VOTE_OUTCOMES.map((outcome) => `${outcome.voteRecordId}:${outcome.indicatorCode}`);

    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it("explica por qué se eligió esa serie", () => {
    for (const outcome of VOTE_OUTCOMES) {
      expect(outcome.reading.length).toBeGreaterThan(MIN_READING_LENGTH);
    }
  });

  it("busca los cruces de una votación por su id", () => {
    const first = VOTE_OUTCOMES[0];

    expect(first).toBeDefined();
    expect(voteOutcomesFor(first?.voteRecordId ?? "")).toContain(first);
    expect(voteOutcomesFor("votacion-inexistente")).toEqual([]);
  });
});
