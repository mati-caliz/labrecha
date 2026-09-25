export const MAX_FAILED_ATTEMPTS = 5;
export const ATTEMPT_WINDOW_SECONDS = 15 * 60;

const MS_PER_SECOND = 1000;
const MAX_TRACKED_CLIENTS = 5000;

const failuresByClient = new Map<string, number[]>();

function recentFailures(client: string, nowMs: number): number[] {
  const cutoff = nowMs - ATTEMPT_WINDOW_SECONDS * MS_PER_SECOND;
  const recent = (failuresByClient.get(client) ?? []).filter((attempt) => attempt > cutoff);
  if (recent.length === 0) {
    failuresByClient.delete(client);
    return [];
  }
  failuresByClient.set(client, recent);
  return recent;
}

function evictIdleClients(nowMs: number): void {
  const cutoff = nowMs - ATTEMPT_WINDOW_SECONDS * MS_PER_SECOND;
  for (const [client, attempts] of failuresByClient) {
    if (attempts.every((attempt) => attempt <= cutoff)) {
      failuresByClient.delete(client);
    }
  }
}

export function blockedRetryAfterSeconds(client: string, nowMs: number = Date.now()): number | null {
  const recent = recentFailures(client, nowMs);
  if (recent.length < MAX_FAILED_ATTEMPTS) {
    return null;
  }
  const oldest = recent[0] ?? nowMs;
  const remainingMs = oldest + ATTEMPT_WINDOW_SECONDS * MS_PER_SECOND - nowMs;
  return Math.max(1, Math.ceil(remainingMs / MS_PER_SECOND));
}

export function registerFailedAttempt(client: string, nowMs: number = Date.now()): void {
  const recent = recentFailures(client, nowMs);
  failuresByClient.set(client, [...recent, nowMs]);
  if (failuresByClient.size > MAX_TRACKED_CLIENTS) {
    evictIdleClients(nowMs);
  }
}

export function clearFailedAttempts(client: string): void {
  failuresByClient.delete(client);
}
