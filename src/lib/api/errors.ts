import type { ApiErrorBody, ApiErrorDetail } from "./types";

/**
 * Base for anything that went wrong talking to the planning API.
 *
 * The previous client swallowed every failure and returned fixture data
 * instead, so a backend that was down, misconfigured or rejecting the request
 * looked exactly like a healthy one. These throw.
 */
export abstract class ApiCallError extends Error {
  constructor(
    message: string,
    readonly method: string,
    readonly path: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}

/** The API answered, and the answer was a failure envelope (04 §1). */
export class ApiError extends ApiCallError {
  readonly code: ApiErrorBody["code"] | (string & {});
  readonly details: ApiErrorDetail[];
  readonly traceId: string | null;

  constructor(
    readonly status: number,
    body: ApiErrorBody,
    method: string,
    path: string,
  ) {
    super(`${method} ${path} → ${status} ${body.code}: ${body.message}`, method, path);
    this.name = "ApiError";
    this.code = body.code;
    this.details = body.details ?? [];
    this.traceId = body.trace_id ?? null;
  }

  /** Which fields the service objected to, flattened for display. */
  get locations(): string[] {
    return this.details
      .map((d) => d.location)
      .filter((l): l is string => typeof l === "string");
  }
}

/**
 * The API could not be reached, or answered with something that is not a
 * failure envelope. Distinct from ApiError because the operator's next move is
 * different: start the backend, rather than fix the request.
 */
export class ApiUnreachableError extends ApiCallError {
  constructor(
    method: string,
    path: string,
    readonly detail: string,
    options?: { cause?: unknown },
  ) {
    super(`${method} ${path} → ${detail}`, method, path, options);
    this.name = "ApiUnreachableError";
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.code === "string" && typeof body.message === "string";
}

export { isApiErrorBody };
