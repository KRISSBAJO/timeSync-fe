import { NextRequest, NextResponse } from "next/server";

import { backendUrl } from "@/lib/api/config";
import { ACCESS_TOKEN_COOKIE, CSRF_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/cookies";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/workforce",
  "/organization",
  "/positions",
  "/workflows",
  "/documents",
  "/notifications",
  "/iam",
  "/tenants",
  "/audit",
  "/settings",
  "/create",
  "/quality",
  "/search",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAccessToken = request.cookies.has(ACCESS_TOKEN_COOKIE);
  const hasRefreshToken = request.cookies.has(REFRESH_TOKEN_COOKIE);
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  if (!hasAccessToken && hasRefreshToken) {
    const refreshed = await refreshRequestSession(request);

    if (refreshed) {
      return refreshed;
    }
  }

  if (!hasAccessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
    response.cookies.delete(CSRF_TOKEN_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/workforce/:path*",
    "/organization/:path*",
    "/positions/:path*",
    "/workflows/:path*",
    "/documents/:path*",
    "/notifications/:path*",
    "/iam/:path*",
    "/tenants/:path*",
    "/audit/:path*",
    "/settings/:path*",
    "/create/:path*",
    "/quality/:path*",
    "/search/:path*",
  ],
};

async function refreshRequestSession(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  const response = await fetch(backendUrl("/auth/refresh"), {
    method: "POST",
    headers: {
      cookie: cookieHeader,
      "user-agent": request.headers.get("user-agent") ?? "",
      "x-forwarded-for": request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const setCookies = getSetCookies(response.headers);

  if (setCookies.length === 0) {
    return null;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("cookie", mergeCookieHeader(cookieHeader, setCookies));

  const nextResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  for (const cookie of setCookies) {
    nextResponse.headers.append("set-cookie", cookie);
  }

  return nextResponse;
}

function getSetCookies(headers: Headers) {
  const typedHeaders = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof typedHeaders.getSetCookie === "function") {
    return typedHeaders.getSetCookie();
  }

  const header = headers.get("set-cookie");
  return header ? splitSetCookieHeader(header) : [];
}

function splitSetCookieHeader(header: string) {
  return header.split(/,(?=\s*[^;,]+=)/g).map((cookie) => cookie.trim());
}

function mergeCookieHeader(cookieHeader: string, setCookies: string[]) {
  const cookies = new Map<string, string>();

  for (const cookie of cookieHeader.split(";")) {
    const [name, ...valueParts] = cookie.trim().split("=");

    if (name) {
      cookies.set(name, valueParts.join("="));
    }
  }

  for (const setCookie of setCookies) {
    const [pair] = setCookie.split(";");
    const [name, ...valueParts] = pair.trim().split("=");

    if (name) {
      cookies.set(name, valueParts.join("="));
    }
  }

  return Array.from(cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}
