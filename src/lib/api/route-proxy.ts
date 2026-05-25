import { NextRequest, NextResponse } from "next/server";

import { backendUrl } from "./config";
import { CSRF_TOKEN_COOKIE } from "@/lib/auth/cookies";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "set-cookie",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function proxyBackendRequest(
  request: NextRequest,
  path: string,
  init?: RequestInit,
) {
  const headers = new Headers(init?.headers);
  const cookieHeader = request.headers.get("cookie");

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  if (!headers.has("content-type") && request.headers.get("content-type")) {
    headers.set("content-type", request.headers.get("content-type") as string);
  }

  if (UNSAFE_METHODS.has(request.method) && !headers.has("x-csrf-token")) {
    const csrfToken = request.cookies.get(CSRF_TOKEN_COOKIE)?.value;

    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
    }
  }

  const method = init?.method ?? request.method;
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
  const backendResponse = await fetch(backendUrl(path, request.nextUrl.search), {
    ...init,
    method,
    body,
    headers,
    cache: "no-store",
  });

  return toNextResponse(backendResponse);
}

export async function toNextResponse(backendResponse: Response) {
  const responseHeaders = new Headers();

  backendResponse.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  if (backendResponse.headers.get("content-type")?.includes("text/event-stream") && backendResponse.body) {
    const response = new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });

    for (const cookie of getSetCookies(backendResponse.headers)) {
      response.headers.append("set-cookie", cookie);
    }

    return response;
  }

  const body = await backendResponse.arrayBuffer();
  const response = new NextResponse(body.byteLength > 0 ? body : null, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });

  for (const cookie of getSetCookies(backendResponse.headers)) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
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
