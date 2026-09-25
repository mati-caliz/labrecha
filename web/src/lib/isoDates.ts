export const ISO_DATE_LENGTH = "YYYY-MM-DD".length;

export const ISO_YEAR_LENGTH = "YYYY".length;

export function compareIsoDates(first: string, second: string): number {
  if (first < second) {
    return -1;
  }
  return first > second ? 1 : 0;
}
