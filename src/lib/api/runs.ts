import "server-only";

import { apiGet, apiPost, apiRequest } from "./client";
import type {
  AlternativeOutcome,
  AlternativeResult,
  AlternativeUnavailableResult,
  Decision,
  DecisionRequest,
  ExplanationResult,
  ExportBundle,
  Run,
} from "./types";

export async function getRun(runId: string): Promise<Run> {
  return apiGet<Run>(`/v1/runs/${encodeURIComponent(runId)}`);
}

/**
 * Ask whether an order can be carried by a permitted adjustment.
 *
 * Three outcomes, and only one of them is an error. 201 means an alternative
 * run exists; 200 means the permitted changes were searched and none works --
 * a real answer, not a failure. 409 means the requested change is forbidden by
 * policy, and that does throw: asking to raise a route clearance is a bug in
 * the caller, not a planning result.
 */
export async function createAlternative(
  runId: string,
  orderId: string,
  adjustmentTypes: string[],
): Promise<AlternativeOutcome> {
  const { status, data } = await apiRequest<
    AlternativeResult | AlternativeUnavailableResult
  >({
    method: "POST",
    path: `/v1/runs/${encodeURIComponent(runId)}/alternatives`,
    body: { order_id: orderId, adjustment_types: adjustmentTypes },
    expect: [200, 201],
  });

  return status === 201
    ? { found: true, ...(data as AlternativeResult) }
    : { found: false, ...(data as AlternativeUnavailableResult) };
}

export async function recordDecision(
  runId: string,
  decision: DecisionRequest,
): Promise<Decision> {
  return apiPost<Decision>(`/v1/runs/${encodeURIComponent(runId)}/decisions`, decision);
}

export async function getExportBundle(runId: string): Promise<ExportBundle> {
  return apiGet<ExportBundle>(`/v1/runs/${encodeURIComponent(runId)}/export`);
}

export async function getExplanation(runId: string): Promise<ExplanationResult> {
  return apiGet<ExplanationResult>(`/v1/runs/${encodeURIComponent(runId)}/explanation`);
}
