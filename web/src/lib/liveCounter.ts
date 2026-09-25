const SECONDS_PER_DAY = 24 * 60 * 60;
const MS_PER_SECOND = 1000;
const LEAP_CYCLE_YEARS = 4;
const CENTURY_YEARS = 100;
const GREGORIAN_CYCLE_YEARS = 400;
const DAYS_IN_LEAP_YEAR = 366;
const DAYS_IN_COMMON_YEAR = 365;

export function projectedValue(
  baseValue: number,
  ratePerSecond: number,
  sinceMs: number,
  nowMs: number,
): number {
  const elapsedSeconds = Math.max(0, (nowMs - sinceMs) / MS_PER_SECOND);
  return baseValue + ratePerSecond * elapsedSeconds;
}

export function startOfCurrentMonth(reference: Date = new Date()): Date {
  return new Date(reference.getFullYear(), reference.getMonth(), 1);
}

export function daysInMonth(reference: Date = new Date()): number {
  return new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();
}

export function monthlyRateToPerSecond(monthlyValue: number, daysInThisMonth: number): number {
  const secondsInMonth = daysInThisMonth * SECONDS_PER_DAY;
  return secondsInMonth > 0 ? monthlyValue / secondsInMonth : 0;
}

export function daysInYear(reference: Date = new Date()): number {
  const year = reference.getFullYear();
  const isLeap =
    (year % LEAP_CYCLE_YEARS === 0 && year % CENTURY_YEARS !== 0) || year % GREGORIAN_CYCLE_YEARS === 0;
  return isLeap ? DAYS_IN_LEAP_YEAR : DAYS_IN_COMMON_YEAR;
}

export function annualValueToPerSecond(annualValue: number, reference: Date = new Date()): number {
  const secondsInYear = daysInYear(reference) * SECONDS_PER_DAY;
  return secondsInYear > 0 ? annualValue / secondsInYear : 0;
}

export function startOfMonthAfter(reference: Date): Date {
  return new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
}
