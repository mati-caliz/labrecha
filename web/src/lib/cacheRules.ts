const CACHE_RULES: { pattern: RegExp; revalidate: number }[] = [
  { pattern: /^political-events/, revalidate: 86400 },
  { pattern: /^congress/, revalidate: 86400 },
  { pattern: /^senate/, revalidate: 86400 },
  { pattern: /^holidays/, revalidate: 86400 },
  { pattern: /^scrape-runs/, revalidate: 300 },
  { pattern: /^news/, revalidate: 900 },
  { pattern: /^posts/, revalidate: 60 },
  { pattern: /^rates/, revalidate: 900 },
  { pattern: /^indicators/, revalidate: 1800 },
];

export const DEFAULT_REVALIDATE = 1800;

const LEADING_SLASH = /^\//;

export function getRevalidateTime(path: string): number {
  const normalized = path.replace(LEADING_SLASH, "");
  for (const rule of CACHE_RULES) {
    if (rule.pattern.test(normalized)) {
      return rule.revalidate;
    }
  }
  return DEFAULT_REVALIDATE;
}
