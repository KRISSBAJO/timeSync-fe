import { cookies } from "next/headers";

import { backendUrl } from "./config";
import { unwrapApiEnvelope } from "./envelope";
import { parseApiError } from "./error";
import { CSRF_TOKEN_COOKIE } from "@/lib/auth/cookies";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function serverApiFetch(path: string, init: RequestInit = {}) {
  const cookieStore = await cookies();
  const headers = new Headers(init.headers);
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  const method = (init.method ?? "GET").toUpperCase();
  if (UNSAFE_METHODS.has(method) && !headers.has("x-csrf-token")) {
    const csrfToken = cookieStore.get(CSRF_TOKEN_COOKIE)?.value;

    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
    }
  }

  return fetch(backendUrl(path), {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function serverApiJson<T>(path: string, init: RequestInit = {}) {
  const response = await serverApiFetch(path, init);

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return unwrapApiEnvelope<T>(await response.json());
}

export async function tryServerApiJson<T>(path: string, init: RequestInit = {}) {
  try {
    return await serverApiJson<T>(path, init);
  } catch {
    return null;
  }
}
