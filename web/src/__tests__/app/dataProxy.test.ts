/**
 * @jest-environment node
 */
import { POST } from "@/app/api/data/[...path]/route";
import { CALCULATOR_PATH_LIST } from "@/lib/calculatorPaths";
import { NextRequest } from "next/server";

const NOT_FOUND = 404;
const CREATED = 201;

function postTo(path: string): [NextRequest, { params: Promise<{ path: string[] }> }] {
  const request = new NextRequest(`https://labrecha.ar/api/data/${path}`, {
    method: "POST",
    body: JSON.stringify({ kind: "TypeError" }),
    headers: { "content-type": "application/json" },
  });
  return [request, { params: Promise.resolve({ path: path.split("/") }) }];
}

describe("the write side of the data proxy", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ fingerprint: "abc" }), {
        status: CREATED,
        headers: { "content-type": "application/json" },
      }),
    );
    global.fetch = fetchMock;
  });

  it("forwards the one path the API accepts writes on", async () => {
    const response = await POST(...postTo("errors"));

    expect(response.status).toBe(CREATED);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("forwards every calculator the site posts to", async () => {
    for (const path of CALCULATOR_PATH_LIST) {
      const response = await POST(...postTo(path));

      expect(response.status).toBe(CREATED);
    }
    expect(fetchMock).toHaveBeenCalledTimes(CALCULATOR_PATH_LIST.length);
  });

  it("refuses any other path without touching the backend", async () => {
    for (const path of ["posts", "indicators/dollar_blue", "errors/../posts", "calculators"]) {
      const response = await POST(...postTo(path));

      expect(response.status).toBe(NOT_FOUND);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
