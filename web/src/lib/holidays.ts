import { ISO_DATE_LENGTH, compareIsoDates } from "@/lib/isoDates";
import type { Holiday } from "@/lib/labrechaApi";

const MS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
const SUNDAY_FIRST_TO_MONDAY_FIRST_SHIFT = 6;
const SATURDAY_MONDAY_FIRST = 5;

export function todayISO(): string {
  return new Date().toISOString().slice(0, ISO_DATE_LENGTH);
}

function toUtcMidnight(isoDate: string): number {
  const [year = 0, month = 1, day = 1] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function daysUntil(isoDate: string, fromISO: string = todayISO()): number {
  return Math.round((toUtcMidnight(isoDate) - toUtcMidnight(fromISO)) / MS_PER_DAY);
}

export function holidayLabel(holiday: Holiday): string {
  return holiday.local_name ?? holiday.name;
}

export function formatLongDate(isoDate: string): string {
  const [year = 0, month = 1, day = 1] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function daysUntilLabel(days: number): string {
  if (days <= 0) {
    return "hoy";
  }
  if (days === 1) {
    return "mañana";
  }
  return `en ${days} días`;
}

export function addDaysISO(isoDate: string, days: number): string {
  return new Date(toUtcMidnight(isoDate) + days * MS_PER_DAY).toISOString().slice(0, ISO_DATE_LENGTH);
}

export function weekdayMondayFirst(isoDate: string): number {
  return (new Date(toUtcMidnight(isoDate)).getUTCDay() + SUNDAY_FIRST_TO_MONDAY_FIRST_SHIFT) % DAYS_PER_WEEK;
}

export function isWeekend(isoDate: string): boolean {
  return weekdayMondayFirst(isoDate) >= SATURDAY_MONDAY_FIRST;
}

export interface FreeRun {
  start: string;
  end: string;
  length: number;
}

export function freeRunAround(isoDate: string, holidayDates: Set<string>): FreeRun {
  const isDayOff = (candidate: string): boolean => isWeekend(candidate) || holidayDates.has(candidate);
  let start = isoDate;
  while (isDayOff(addDaysISO(start, -1))) {
    start = addDaysISO(start, -1);
  }
  let end = isoDate;
  while (isDayOff(addDaysISO(end, 1))) {
    end = addDaysISO(end, 1);
  }
  return { start, end, length: daysUntil(end, start) + 1 };
}

export function upcomingHolidays(holidays: Holiday[], fromISO: string = todayISO(), count = 4): Holiday[] {
  return holidays
    .filter((holiday) => holiday.date >= fromISO)
    .sort((first, second) => compareIsoDates(first.date, second.date))
    .slice(0, count);
}
