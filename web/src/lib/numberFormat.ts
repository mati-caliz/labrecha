import { hasText } from "@/lib/utils";
export function formatNumberAR(value: number, fractionDigits = 0): string {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatMoneyAR(value: number, fractionDigits = 0): string {
  return `$ ${formatNumberAR(value, fractionDigits)}`;
}

export function formatUsdAR(value: number, fractionDigits = 0): string {
  return `US$ ${formatNumberAR(value, fractionDigits)}`;
}

export const MILLONES_POR_BILLON = 1_000_000;

export function formatBillonesAR(valueInMillones: number, fractionDigits = 2): string {
  return `$ ${formatNumberAR(valueInMillones / MILLONES_POR_BILLON, fractionDigits)} billones`;
}

export function formatDateAR(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!hasText(year) || !hasText(month) || !hasText(day)) {
    return isoDate;
  }
  return `${day}/${month}/${year}`;
}

const MONTH_NAMES_AR = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function formatMonthAR(isoDate: string): string {
  const [year, month] = isoDate.split("-");
  const name = MONTH_NAMES_AR[Number(month) - 1];
  if (!hasText(year) || !hasText(name)) {
    return isoDate;
  }
  return `${name} de ${year}`;
}
