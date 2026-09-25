import { assumeJsonShape } from "@/lib/assumeJsonShape";
import { getRevalidateTime } from "@/lib/cacheRules";
import { hasText } from "@/lib/utils";

const LEADING_SLASH = /^\//;

export function getBackendUrl(): string {
  const internalUrl = process.env.LABRECHA_API_INTERNAL_URL;
  if (hasText(internalUrl)) {
    return internalUrl;
  }

  const publicUrl = process.env.NEXT_PUBLIC_LABRECHA_API_URL;
  return hasText(publicUrl) ? publicUrl : "http://localhost:8000";
}

export function buildQueryString(params?: object): string {
  if (!params) {
    return "";
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  }
  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}

export async function serverGet<T>(path: string, revalidate?: number): Promise<T> {
  const normalized = path.replace(LEADING_SLASH, "");
  const url = `${getBackendUrl()}/${normalized}`;
  const res = await fetch(url, {
    next: { revalidate: revalidate ?? getRevalidateTime(normalized) },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Backend responded ${res.status} for ${path}`);
  }
  const payload: unknown = await res.json();
  return assumeJsonShape<T>(payload);
}

export async function serverPost<T>(path: string, body: unknown): Promise<T> {
  const normalized = path.replace(LEADING_SLASH, "");
  const res = await fetch(`${getBackendUrl()}/${normalized}`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Backend responded ${res.status} for ${path}`);
  }
  const payload: unknown = await res.json();
  return assumeJsonShape<T>(payload);
}
