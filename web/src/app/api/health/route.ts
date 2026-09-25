import { NextResponse } from "next/server";

export function GET(): NextResponse<{ status: string; timestamp: string }> {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
