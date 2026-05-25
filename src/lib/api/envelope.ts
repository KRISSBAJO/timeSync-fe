import type { ApiEnvelope } from "./types";

export function unwrapApiEnvelope<T>(payload: unknown): T {
  if (isApiEnvelope<T>(payload)) {
    return payload.data;
  }

  return payload as T;
}

function isApiEnvelope<T>(payload: unknown): payload is ApiEnvelope<T> {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      "data" in payload &&
      "meta" in payload,
  );
}
