/**
 * @jest-environment node
 */
import { UNKNOWN_CLIENT, clientIp } from "@/lib/clientIp";
import { NextRequest } from "next/server";

const REAL_CLIENT = "203.0.113.7";

function requestWith(headers: Record<string, string>): NextRequest {
  return new NextRequest("https://labrecha.ar/api/posts", { headers });
}

describe("clientIp", () => {
  it("trusts the header nginx overwrites", () => {
    const request = requestWith({
      "x-real-ip": REAL_CLIENT,
      "x-forwarded-for": "9.9.9.9, 8.8.8.8",
    });

    expect(clientIp(request)).toBe(REAL_CLIENT);
  });

  it("takes the last forwarded hop when there is no real ip", () => {
    const request = requestWith({ "x-forwarded-for": `1.1.1.1, ${REAL_CLIENT}` });

    expect(clientIp(request)).toBe(REAL_CLIENT);
  });

  it("cannot be split into many clients by a forged forwarded for", () => {
    const keys = new Set(
      Array.from({ length: 50 }, (_unused, attempt) =>
        clientIp(requestWith({ "x-real-ip": REAL_CLIENT, "x-forwarded-for": `10.0.0.${attempt}` })),
      ),
    );

    expect(keys).toEqual(new Set([REAL_CLIENT]));
  });

  it("falls back to a single bucket when there is no header at all", () => {
    expect(clientIp(requestWith({}))).toBe(UNKNOWN_CLIENT);
  });
});
