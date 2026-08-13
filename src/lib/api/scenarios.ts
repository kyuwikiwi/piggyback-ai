import "server-only";

import canonicalScenario from "@/data/canonical-v1/scenario.json";

import { apiGet, apiPost, apiRequest } from "./client";
import type {
  Run,
  Scenario,
  ScenarioCreateRequest,
  ScenarioDetail,
  ScenarioInputSnapshot,
  ScenarioSummary,
  SolverParameters,
  ValidationResult,
} from "./types";

/**
 * 07 §7 pins these three values; the reproducibility hashes in
 * `fixtures/canonical-v1/expected-results.json` only reproduce with them.
 * num_search_workers must be 1 or the service rejects the run outright --
 * anything else makes tie-breaking non-deterministic.
 */
export const CANONICAL_SOLVER_PARAMETERS: SolverParameters = {
  random_seed: 7,
  num_search_workers: 1,
  max_time_seconds: 10,
};

const CANONICAL_SCENARIO_NAME = "canonical-v1-baseline";

/**
 * Build the create request the way the backend's `canonical_create_request()`
 * does: every envelope field except the name is derived from the snapshot, and
 * the service re-checks that agreement (policy_version must equal
 * input_snapshot.policy.policy_version, and the ids must resolve).
 *
 * `input_snapshot` is the imported document itself, passed straight through.
 * That is load-bearing: `input_snapshot_sha256` is taken over the JSON as
 * submitted, so rebuilding the object -- spreading it, running it through a
 * typed model, adding an absent optional -- changes the hash and breaks the
 * fixture match. Read it, do not reshape it.
 */
export function canonicalCreateRequest() {
  const snapshot = canonicalScenario as unknown as ScenarioInputSnapshot;
  return {
    scenario_name: CANONICAL_SCENARIO_NAME,
    as_of: snapshot.as_of,
    baseline_service_ids: [...snapshot.baseline_service_ids],
    policy_version: snapshot.policy.policy_version,
    assumption_ids: snapshot.assumptions.map((a) => a.assumption_id),
    input_snapshot: canonicalScenario,
  };
}

export async function createCanonicalScenario(): Promise<Scenario> {
  return apiPost<Scenario>("/v1/scenarios", canonicalCreateRequest());
}

/**
 * Create a scenario from a snapshot this app assembled.
 *
 * The canonical request is passed through untouched because its hash has to
 * match the fixture. A scenario the operator built by adding an order is a
 * different document with a different hash, which is the point: it is a new
 * immutable snapshot, not an edit of the old one.
 */
export async function createScenario(request: ScenarioCreateRequest): Promise<Scenario> {
  return apiPost<Scenario>("/v1/scenarios", request);
}

/** Stored scenarios, newest first. Without this a lost id is lost work. */
export async function listScenarios(limit = 20): Promise<ScenarioSummary[]> {
  return apiGet<ScenarioSummary[]>(`/v1/scenarios?limit=${limit}`);
}

/** The scenario plus the snapshot it was created from. */
export async function getScenario(scenarioId: string): Promise<ScenarioDetail> {
  return apiGet<ScenarioDetail>(`/v1/scenarios/${encodeURIComponent(scenarioId)}`);
}

export async function validateScenario(scenarioId: string): Promise<ValidationResult> {
  return apiPost<ValidationResult>(
    `/v1/scenarios/${encodeURIComponent(scenarioId)}/validate`,
  );
}

/**
 * The validation a scenario already has, or null if it has none yet.
 *
 * Screens read; they do not validate. `POST /validate` records a
 * VALIDATION_COMPLETED event, so a dashboard that validated on every render
 * wrote a line into the audit trail for every visit and the trail stopped
 * describing what anyone did.
 *
 * A 422 means the scenario was created and never validated -- a real state the
 * screen answers with a button, not an error.
 */
export async function readValidation(scenarioId: string): Promise<ValidationResult | null> {
  const { status, data } = await apiRequest<ValidationResult>({
    method: "GET",
    path: `/v1/scenarios/${encodeURIComponent(scenarioId)}/validation`,
    expect: [200, 422],
  });
  return status === 200 ? data : null;
}

export async function deleteScenario(scenarioId: string): Promise<void> {
  await apiRequest<null>({
    method: "DELETE",
    path: `/v1/scenarios/${encodeURIComponent(scenarioId)}`,
    expect: [204],
  });
}

export async function createRun(
  scenarioId: string,
  solverParameters: SolverParameters = CANONICAL_SOLVER_PARAMETERS,
): Promise<Run> {
  return apiPost<Run>(`/v1/scenarios/${encodeURIComponent(scenarioId)}/runs`, {
    solver_parameters: solverParameters,
  });
}
