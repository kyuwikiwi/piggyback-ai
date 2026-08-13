import "server-only";

import { apiGet } from "./client";
import { ApiCallError } from "./errors";
import type { AiStatus, Health } from "./types";

export async function getHealth(): Promise<Health> {
  return apiGet<Health>("/health");
}

export async function getAiStatus(): Promise<AiStatus> {
  return apiGet<AiStatus>("/v1/ai/status");
}

export type BackendStatus =
  | { reachable: true; health: Health; ai: AiStatus }
  | { reachable: false; detail: string };

/**
 * The one place a failed call is caught rather than thrown.
 *
 * Everywhere else an unreachable API must break the page, because a planning
 * screen that renders anyway is lying. Here the whole point is to *show* that
 * the backend is not answering, so the failure is the content.
 */
export async function probeBackend(): Promise<BackendStatus> {
  try {
    const [health, ai] = await Promise.all([getHealth(), getAiStatus()]);
    return { reachable: true, health, ai };
  } catch (error) {
    if (error instanceof ApiCallError) {
      return { reachable: false, detail: error.message };
    }
    return {
      reachable: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
