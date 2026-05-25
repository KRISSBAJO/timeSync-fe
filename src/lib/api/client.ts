"use client";

import { parseApiError } from "./error";
import { unwrapApiEnvelope } from "./envelope";
import type { AuthSession, AuthWorkspace, BrowserSession } from "./types";
import { CSRF_TOKEN_COOKIE, readBrowserCookie } from "@/lib/auth/cookies";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type ApiFetchOptions = RequestInit & {
  retryOnUnauthorized?: boolean;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}) {
  const response = await fetchWithDefaults(path, options);

  if (response.status === 401 && options.retryOnUnauthorized !== false) {
    const refreshed = await refreshSession();

    if (refreshed) {
      const retryResponse = await fetchWithDefaults(path, {
        ...options,
        retryOnUnauthorized: false,
      });

      if (retryResponse.ok) {
        return (await retryResponse.json()) as T;
      }

      throw await parseApiError(retryResponse);
    }
  }

  if (!response.ok) {
    throw await parseApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return unwrapApiEnvelope<T>(await response.json());
}

export async function login(input: {
  email: string;
  password: string;
  tenantSlug?: string;
  rememberDevice?: boolean;
}) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return unwrapApiEnvelope<AuthSession>(await response.json());
}

export async function logout(allSessions = false) {
  await fetch(allSessions ? "/api/auth/logout-all" : "/api/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: csrfHeaders("POST"),
  });
}

export async function getCurrentSession() {
  return apiFetch<AuthSession>("/auth/me", { retryOnUnauthorized: true });
}

export async function listWorkspaces() {
  return apiFetch<AuthWorkspace[]>("/auth/workspaces");
}

export async function switchWorkspace(membershipId: string) {
  return apiFetch<AuthSession>(`/auth/workspaces/${membershipId}/switch`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function listBrowserSessions() {
  return apiFetch<BrowserSession[]>("/auth/sessions");
}

async function refreshSession() {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });

  return response.ok;
}

async function fetchWithDefaults(path: string, options: ApiFetchOptions) {
  const headers = new Headers(options.headers);
  const method = (options.method ?? "GET").toUpperCase();

  if (options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  for (const [key, value] of csrfHeaders(method)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }

  return fetch(toProxyPath(path), {
    ...options,
    method,
    headers,
    credentials: "include",
  });
}

function csrfHeaders(method: string) {
  const headers = new Headers();

  if (UNSAFE_METHODS.has(method)) {
    const csrfToken = readBrowserCookie(CSRF_TOKEN_COOKIE);

    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
    }
  }

  return headers;
}

function toProxyPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `/api/backend/${normalizedPath}`;
}
