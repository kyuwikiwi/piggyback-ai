"use server";

import { redirect } from "next/navigation";

import {
  CANONICAL_SOLVER_PARAMETERS,
  createAlternative,
  createRun,
  createScenario,
  deleteScenario,
  getScenario,
  readValidation,
  validateScenario,
} from "@/lib/api";

/**
 * The writes a scenario screen can start.
 *
 * They used to be closures inside the dashboard component, which was fine while
 * there was one dashboard. Four tabs now share them -- 삭제 sits in the header
 * on every tab, 대안 검토 is reachable from both 편성 and AI -- and a closure
 * cannot be shared. Each takes the ids it needs from the form and re-reads the
 * scenario rather than having a snapshot posted back through the browser.
 *
 * Every one of these is a POST because it stores something. Behind a URL, a
 * refresh would run it again and a prefetch could start a solve nobody asked
 * for.
 */

function scenarioPath(scenarioId: string): string {
  return `/scenarios/${encodeURIComponent(scenarioId)}`;
}

/**
 * Validate if needed, then solve.
 *
 * The solver parameters come from the form so the reproducibility settings are
 * visible and adjustable rather than a constant nobody can see -- the service
 * refuses anything but one worker, which is worth being able to find out.
 */
export async function solveScenario(formData: FormData) {
  const scenarioId = String(formData.get("scenario_id") ?? "");
  if (!scenarioId) return;

  if (!(await readValidation(scenarioId))) await validateScenario(scenarioId);

  await createRun(scenarioId, {
    random_seed: Number(formData.get("random_seed") ?? CANONICAL_SOLVER_PARAMETERS.random_seed),
    // Pinned by the contract, and typed as the literal 1, so it is shown beside
    // the form rather than offered as a field. A screen that could send 2 would
    // only be able to demonstrate the service refusing it.
    num_search_workers: CANONICAL_SOLVER_PARAMETERS.num_search_workers,
    max_time_seconds: Number(
      formData.get("max_time_seconds") ?? CANONICAL_SOLVER_PARAMETERS.max_time_seconds,
    ),
  });

  // Outside any try/catch: redirect signals by throwing.
  redirect(scenarioPath(scenarioId));
}

/**
 * Solve the same orders against a different set of baseline services.
 *
 * `baseline_service_ids` belongs to the scenario, not the run, so widening the
 * candidate set is a new snapshot rather than another solve -- which is right:
 * it is a different question, and the answer to the old one stays where it was.
 */
export async function rebaselineScenario(formData: FormData) {
  const scenarioId = String(formData.get("scenario_id") ?? "");
  if (!scenarioId) return;

  const chosen = formData.getAll("service_ids").map(String).filter(Boolean);
  if (chosen.length === 0) redirect(`${scenarioPath(scenarioId)}/lineage`);

  const scenario = await getScenario(scenarioId);

  const created = await createScenario({
    scenario_name: `기준 운행 ${chosen.join(", ")}`,
    as_of: scenario.as_of,
    baseline_service_ids: chosen,
    policy_version: scenario.policy_version,
    assumption_ids: [...scenario.assumption_ids],
    input_snapshot: { ...scenario.input_snapshot, baseline_service_ids: chosen },
    parent_scenario_id: scenario.scenario_id,
  });

  await validateScenario(created.scenario_id);
  await createRun(created.scenario_id);

  redirect(scenarioPath(created.scenario_id));
}

export async function deleteScenarioAction(formData: FormData) {
  const scenarioId = String(formData.get("scenario_id") ?? "");
  if (!scenarioId) return;

  await deleteScenario(scenarioId);
  redirect("/");
}

/**
 * Search the approved alternatives for one order.
 *
 * On success the derived scenario is a scenario like any other, so the redirect
 * just opens it. A miss is a real answer rather than a failure, and it comes
 * back to the tab that asked with the reason in the URL.
 */
export async function searchAlternative(formData: FormData) {
  const scenarioId = String(formData.get("scenario_id") ?? "");
  const orderId = String(formData.get("order_id") ?? "");
  const forRunId = String(formData.get("run_id") ?? "");
  // Where to land on a miss: the 편성 tab reopens the order beside the plan,
  // the AI tab keeps the proposal it came from in view.
  const from = String(formData.get("from") ?? "");

  const base = scenarioPath(scenarioId);
  const miss =
    from === "ai"
      ? `${base}/ai`
      : `${base}?order=${encodeURIComponent(orderId)}`;

  // Checkboxes, so the operator can ask about one approved change at a time.
  const adjustments = formData.getAll("adjustments").map(String).filter(Boolean);
  if (adjustments.length === 0) redirect(miss);

  const outcome = await createAlternative(forRunId, orderId, adjustments);

  // Outside any try/catch: redirect signals by throwing.
  redirect(
    outcome.found
      ? scenarioPath(outcome.alternative_scenario_id)
      : `${miss}${from === "ai" ? "?" : "&"}altmiss=${encodeURIComponent(orderId)}` +
          `&altreason=${encodeURIComponent(outcome.reason_code)}`,
  );
}
