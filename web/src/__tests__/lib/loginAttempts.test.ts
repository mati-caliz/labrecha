import {
  ATTEMPT_WINDOW_SECONDS,
  MAX_FAILED_ATTEMPTS,
  blockedRetryAfterSeconds,
  clearFailedAttempts,
  registerFailedAttempt,
} from "@/lib/loginAttempts";

const NOW_MS = Date.UTC(2026, 6, 26, 12, 0, 0);
const MS_PER_SECOND = 1000;
const CLIENT = "203.0.113.7";
const OTHER_CLIENT = "198.51.100.30";

function fail(times: number, nowMs = NOW_MS): void {
  for (let attempt = 0; attempt < times; attempt += 1) {
    registerFailedAttempt(CLIENT, nowMs);
  }
}

describe("login attempts", () => {
  beforeEach(() => {
    clearFailedAttempts(CLIENT);
    clearFailedAttempts(OTHER_CLIENT);
  });

  it("lets a client keep trying below the limit", () => {
    fail(MAX_FAILED_ATTEMPTS - 1);

    expect(blockedRetryAfterSeconds(CLIENT, NOW_MS)).toBeNull();
  });

  it("blocks the client once it reaches the limit", () => {
    fail(MAX_FAILED_ATTEMPTS);

    expect(blockedRetryAfterSeconds(CLIENT, NOW_MS)).toBe(ATTEMPT_WINDOW_SECONDS);
  });

  it("frees the client when the window slides past its oldest failure", () => {
    fail(MAX_FAILED_ATTEMPTS);
    const afterWindow = NOW_MS + (ATTEMPT_WINDOW_SECONDS + 1) * MS_PER_SECOND;

    expect(blockedRetryAfterSeconds(CLIENT, afterWindow)).toBeNull();
  });

  it("counts down the remaining block time", () => {
    fail(MAX_FAILED_ATTEMPTS);
    const halfway = NOW_MS + (ATTEMPT_WINDOW_SECONDS / 2) * MS_PER_SECOND;

    expect(blockedRetryAfterSeconds(CLIENT, halfway)).toBe(ATTEMPT_WINDOW_SECONDS / 2);
  });

  it("forgets the failures of a client that logs in", () => {
    fail(MAX_FAILED_ATTEMPTS);
    clearFailedAttempts(CLIENT);

    expect(blockedRetryAfterSeconds(CLIENT, NOW_MS)).toBeNull();
  });

  it("does not block a different client", () => {
    fail(MAX_FAILED_ATTEMPTS);

    expect(blockedRetryAfterSeconds(OTHER_CLIENT, NOW_MS)).toBeNull();
  });
});
