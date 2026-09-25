import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { hasText } from "@/lib/utils";

const PROTECTED_ROUTES: string[] = [];

const PUBLIC_ONLY_ROUTES = ["/login"];

function isNextInternalChunk(pathname: string): boolean {
  return (
    pathname.includes("app-pages-internals") ||
    pathname.includes("main-app") ||
    pathname.endsWith("main-app.js")
  );
}

export function proxy(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;

  if (isNextInternalChunk(pathname)) {
    return new NextResponse(null, { status: 204 });
  }

  if (PROTECTED_ROUTES.length === 0) {
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => path.startsWith(route));
  const isPublicOnlyRoute = PUBLIC_ONLY_ROUTES.includes(path);
  const cookieValue = request.cookies.get("accessToken")?.value;
  const token = hasText(cookieValue) ? cookieValue : "";

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPublicOnlyRoute && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.json).*)"],
};
