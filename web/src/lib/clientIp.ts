import type { NextRequest } from "next/server";
import { hasText } from "@/lib/utils";

export const UNKNOWN_CLIENT = "desconocido";

const REAL_IP = "x-real-ip";
const FORWARDED_FOR = "x-forwarded-for";

export function clientIp(request: NextRequest): string {
  const realIp = request.headers.get(REAL_IP)?.trim();
  if (hasText(realIp)) {
    return realIp;
  }
  const hops = (request.headers.get(FORWARDED_FOR) ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter((hop) => hop.length > 0);
  return hops[hops.length - 1] ?? UNKNOWN_CLIENT;
}
