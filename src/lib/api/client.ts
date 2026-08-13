import "server-only";

import { ApiError, ApiUnreachableError, isApiErrorBody } from "./errors";

/**
 * Where the planning API lives.
 *
 * Read at call time rather than module scope so a missing value fails on the
 * request that needed it, naming the request, instead of at import time with no
 * context. Deliberately not NEXT_PUBLIC_: every caller here runs on the server.
 */
function baseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error(
      "API_BASE_URL is not set. Copy .env.example to .env.local (local backend: http://127.0.0.1:8000).",
    );
  }
  return url.replace(/\/+$/, "");
}

export interface ApiRequest {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  /** Statuses to hand back instead of throwing. Used for the 200/201 split on alternatives. */
  expect?: number[];
}

export interface ApiResponse<T> {
  status: number;
  data: T;
}

/**
 * One request against the planning API.
 *
 * Every failure throws. Planning screens must not render a plausible-looking
 * page built from stale or invented data -- an operator reading "편성 가능" has
 * no way to tell that the service never answered.
 */
export async function apiRequest<T>({
  method,
  path,
  body,
  expect,
}: ApiRequest): Promise<ApiResponse<T>> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      // Planning results change with every run; a cached page would show an
      // operator someone else's solve. Next 16 does not cache fetch by default,
      // but the intent is worth stating.
      cache: "no-store",
    });
  } catch (cause) {
    throw new ApiUnreachableError(
      method,
      path,
      cause instanceof Error ? cause.message : "fetch failed",
      { cause },
    );
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (cause) {
      throw new ApiUnreachableError(
        method,
        path,
        `${response.status} with a non-JSON body: ${text.slice(0, 200)}`,
        { cause },
      );
    }
  }

  const accepted = expect ?? [200, 201];
  if (!accepted.includes(response.status)) {
    if (isApiErrorBody(payload)) {
      throw new ApiError(response.status, payload, method, path);
    }
    throw new ApiUnreachableError(
      method,
      path,
      `${response.status} without a failure envelope: ${text.slice(0, 200)}`,
    );
  }

  return { status: response.status, data: payload as T };
}

/** The common case: one accepted status, and only the body is interesting. */
export async function apiGet<T>(path: string): Promise<T> {
  return (await apiRequest<T>({ method: "GET", path })).data;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return (await apiRequest<T>({ method: "POST", path, body })).data;
}
