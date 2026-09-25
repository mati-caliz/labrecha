const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MS_PER_MINUTE = MS_PER_SECOND * SECONDS_PER_MINUTE;

export function formatElapsedSince(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / MS_PER_MINUTE);
  if (Number.isNaN(minutes)) {
    return "—";
  }
  if (minutes < 1) {
    return "recién";
  }
  if (minutes < MINUTES_PER_HOUR) {
    return `hace ${minutes} min`;
  }
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) {
    return `hace ${hours} h`;
  }
  const days = Math.floor(hours / HOURS_PER_DAY);
  return `hace ${days} día${days === 1 ? "" : "s"}`;
}

export function formatDurationBetween(startIso: string, endIso: string): string {
  const seconds = (new Date(endIso).getTime() - new Date(startIso).getTime()) / MS_PER_SECOND;
  if (Number.isNaN(seconds) || seconds < 0) {
    return "—";
  }
  if (seconds < SECONDS_PER_MINUTE) {
    return `${seconds.toFixed(1)} s`;
  }
  return `${Math.round(seconds / SECONDS_PER_MINUTE)} min`;
}
