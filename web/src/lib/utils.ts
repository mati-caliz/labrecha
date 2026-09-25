import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const MILLION = 1_000_000;
const THOUSAND = 1_000;

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatReservesUSD(value: number): string {
  return `${new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value))} M USD`;
}

export function getGapColor(level: string): string {
  switch (level) {
    case "LOW":
    case "BAJA":
      return "hsl(152 75% 25%)";
    case "MEDIUM":
    case "MEDIA":
      return "hsl(38 92% 28%)";
    case "HIGH":
    case "ALTA":
      return "hsl(0 75% 38%)";
    default:
      return "#6b7280";
  }
}

export function getGapClass(level: string): string {
  switch (level) {
    case "LOW":
    case "BAJA":
      return "text-green-500 animate-pulse-green";
    case "MEDIUM":
    case "MEDIA":
      return "text-yellow-500 animate-pulse-yellow";
    case "HIGH":
    case "ALTA":
      return "text-red-500 animate-pulse-red";
    default:
      return "text-gray-500";
  }
}

export function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatCurrency(value: number | null | undefined): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(0);
  }
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(numericValue);
}

export function formatPercent(value: number | string, decimals = 2): string {
  return `${Number(value).toFixed(decimals)}%`;
}

export function formatVariation(value: number, decimals = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatCurrencyNoDecimals(value: number | null | undefined): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(0);
  }
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(numericValue);
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
}

export function formatDateDayShort(dateStr: string): string {
  if (!dateStr) {
    return "Invalid Date";
  }

  let date: Date;

  if (dateStr.includes("T") || dateStr.includes("Z")) {
    date = new Date(dateStr);
  } else if (dateStr.includes("-")) {
    const [year = 0, month = 1, day = 1] = dateStr.split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateStr);
  }

  if (Number.isNaN(date.getTime())) {
    return "Invalid Date";
  }

  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

export function formatDateSlash(dateStr: string | undefined): string | null {
  if (!hasText(dateStr)) {
    return null;
  }
  const [year, month, day] = dateStr.split("-");
  return hasText(day) && hasText(month) && hasText(year) ? `${day}/${month}/${year}` : dateStr;
}

export function formatLimit(limit: number | undefined): string | null {
  if (limit === undefined || limit <= 0) {
    return null;
  }
  if (limit >= MILLION) {
    return `$${(limit / MILLION).toFixed(0)} M`;
  }
  if (limit >= THOUSAND) {
    return `$${(limit / THOUSAND).toFixed(0)} K`;
  }
  return `$${limit}`;
}

interface ChartDataWithDate {
  date: string;
  originalDate: string;
  [key: string]: string | number;
}

interface Government {
  startDate: string;
  endDate: string;
  label: string;
  color: string;
}

interface ReferenceArea {
  x1: string | number;
  x2: string | number;
  fill: string;
  label: string;
}

function axisDateAt(chartData: ChartDataWithDate[], index: number): string {
  const point = chartData[index];
  if (hasText(point?.originalDate)) {
    return point.originalDate;
  }
  return hasText(point?.date) ? point.date : "";
}

function firstIndexOnOrAfter(chartData: ChartDataWithDate[], boundary: Date): number {
  const index = chartData.findIndex((point) => new Date(point.originalDate) >= boundary);
  return index === -1 ? 0 : index;
}

function lastIndexOnOrBefore(chartData: ChartDataWithDate[], boundary: Date): number {
  for (let index = chartData.length - 1; index >= 0; index -= 1) {
    if (new Date(chartData[index]?.originalDate ?? "") <= boundary) {
      return index;
    }
  }
  return chartData.length - 1;
}

export function generateReferenceAreas(
  chartData: ChartDataWithDate[],
  governments: Government[],
  useIndex = false,
): ReferenceArea[] {
  if (chartData.length === 0) {
    return [];
  }

  const firstOriginalDate = chartData[0]?.originalDate;
  const lastOriginalDate = chartData[chartData.length - 1]?.originalDate;
  const firstDataDate = new Date(hasText(firstOriginalDate) ? firstOriginalDate : "");
  const lastDataDate = new Date(hasText(lastOriginalDate) ? lastOriginalDate : "");
  const axisValueAt = useIndex
    ? (index: number): string | number => index
    : (index: number): string | number => axisDateAt(chartData, index);

  return governments
    .filter((gov) => new Date(gov.startDate) <= lastDataDate && new Date(gov.endDate) >= firstDataDate)
    .map((gov) => ({
      x1: axisValueAt(firstIndexOnOrAfter(chartData, new Date(gov.startDate))),
      x2: axisValueAt(lastIndexOnOrBefore(chartData, new Date(gov.endDate))),
      fill: gov.color,
      label: gov.label,
    }));
}

export function hasText(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && value !== "";
}
