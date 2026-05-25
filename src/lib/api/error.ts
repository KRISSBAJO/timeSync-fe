import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null, fallback = "Request failed") {
    const message = readApiErrorMessage(body, fallback);

    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function parseApiError(response: Response) {
  let body: ApiErrorBody | null = null;

  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = null;
  }

  return new ApiError(response.status, body);
}

function readApiErrorMessage(body: ApiErrorBody | null, fallback: string) {
  const nested = typeof body?.error === "object" ? body.error : null;
  const message = nested?.message ?? body?.message;

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  if (message) {
    return message;
  }

  if (typeof body?.error === "string") {
    return body.error;
  }

  return fallback;
}
