import "server-only";

import { cache } from "react";

import {
  getAiStatus,
  getExplanation,
  getRun,
  getScenario,
  listScenarios,
  readValidation,
} from "@/lib/api";
import type {
  AiStatus,
  ExplanationCard,
  ExplanationResult,
  OrderOutcome,
  Run,
  ScenarioDetail,
  ScenarioSummary,
  ValidationResult,
} from "@/lib/api";
import type { ComparableOutcome } from "./constraints";
import { reasonLabel } from "./reasons";
import { indexSnapshot, slotsOfService, type SnapshotIndex } from "./snapshot";

/**
 * Everything the four scenario tabs read, fetched and bucketed once.
 *
 * The dashboard used to be one page, so this all lived inside its component.
 * Splitting it by question -- 편성 / 타임라인 / AI / 계보 -- meant four routes
 * that each need the same head: which scenario, which run, and how the nine
 * orders fall across the state axes. Deriving that four different ways is how
 * two tabs start disagreeing about how many orders are 불가.
 *
 * `cache` is React's per-request memo, not a data cache: the API client sends
 * `no-store` and nothing here survives the response. It only stops one render
 * from fetching the same run twice.
 */

export interface OrderRow {
  orderId: string;
  inputState: OrderOutcome["input_state"];
  eligibilityState: OrderOutcome["eligibility_state"];
  /** Null until a run exists -- there is no assignment to report yet. */
  assignmentState: OrderOutcome["assignment_state"] | null;
  alternativeState: OrderOutcome["alternative_state"] | null;
  alternativeScenarioId: string | null;
  primaryReasonCode: string | null;
  displayLabel: string | null;
  displayBadges: readonly string[];
  detail: string | null;
  eligibleSlotCount: number | null;
  comparable: ComparableOutcome | null;
  /** Missing inputs, from the validation. Empty unless 확인 필요. */
  missingFields: readonly string[];
  /** What the generative layer proposes trying, if anything. A proposal only. */
  suggestion: { reason: string; types: readonly string[] } | null;
}

export interface ScenarioView {
  scenario: ScenarioDetail;
  snapshot: ScenarioDetail["input_snapshot"];
  idx: SnapshotIndex;
  runId: string | null;
  run: Run | null;
  validation: ValidationResult | null;
  explanation: ExplanationResult | null;
  ai: AiStatus;
  cardByOrder: Map<string, ExplanationCard>;

  rows: OrderRow[];
  /** 02 §4: buckets are a reading of the stored axes, not a new judgement. */
  review: OrderRow[];
  assigned: OrderRow[];
  waiting: OrderRow[];
  pending: OrderRow[];
  ineligible: OrderRow[];
  unclassified: OrderRow[];
  capacity: number;

  parentId: string | null;
  parent: ScenarioSummary | null;
  parentRun: Run | null;
  derived: ScenarioSummary[];
}

export const loadScenarioView = cache(
  async (scenarioId: string, runParam?: string): Promise<ScenarioView> => {
    const scenario = await getScenario(scenarioId);
    const runId = runParam ?? scenario.latest_run_id ?? null;

    // Read, never validate. `POST /validate` records a VALIDATION_COMPLETED
    // event, so a screen that validated on every render wrote a line into the
    // audit trail for every visit and the trail stopped describing what anyone
    // did. Null means the scenario was created and never validated -- a real
    // state the 편성 tab answers with a button.
    const [validation, run, explanation, siblings, ai] = await Promise.all([
      readValidation(scenarioId),
      runId ? getRun(runId) : Promise.resolve(null),
      runId ? getExplanation(runId) : Promise.resolve(null),
      listScenarios(100),
      getAiStatus(),
    ]);

    const idx = indexSnapshot(scenario.input_snapshot);
    const { snapshot } = idx;

    const parentId = scenario.parent_scenario_id ?? null;
    const derived = siblings.filter((s) => s.parent_scenario_id === scenarioId);
    const parent = parentId
      ? (siblings.find((s) => s.scenario_id === parentId) ?? null)
      : null;

    // A derived plan is only meaningful against the one it came from, and the
    // parent's own run is where the comparison has to come from -- the response
    // that created this scenario is long gone by the time someone opens the link.
    const parentRun: Run | null = parent?.latest_run_id
      ? await getRun(parent.latest_run_id)
      : null;

    const validationByOrder = new Map((validation?.orders ?? []).map((o) => [o.order_id, o]));
    const outcomeByOrder = new Map((run?.order_outcomes ?? []).map((o) => [o.order_id, o]));
    const cardByOrder = new Map((explanation?.cards ?? []).map((c) => [c.order_id, c]));

    // Driven by the snapshot's own order list so nothing can silently drop out
    // of the picture, whichever verdict source is available.
    const rows: OrderRow[] = snapshot.orders.map((order) => {
      const outcome = outcomeByOrder.get(order.order_id);
      const validated = validationByOrder.get(order.order_id);
      const card = cardByOrder.get(order.order_id);
      const primaryReasonCode =
        outcome?.primary_reason_code ?? validated?.primary_reason_code ?? null;

      return {
        orderId: order.order_id,
        inputState: outcome?.input_state ?? validated?.input_state ?? "VALID",
        eligibilityState:
          outcome?.eligibility_state ?? validated?.eligibility_state ?? "NOT_EVALUATED",
        assignmentState: outcome?.assignment_state ?? null,
        alternativeState: outcome?.alternative_state ?? null,
        alternativeScenarioId: outcome?.alternative_scenario_id ?? null,
        primaryReasonCode,
        displayLabel: card?.display_label ?? outcome?.display_label ?? null,
        // Badges are additive by contract, and the explanation was fetched
        // before any alternative ran -- union rather than pick, so
        // `조건부 대안 있음` survives next to the card's own badges.
        displayBadges: Array.from(
          new Set([...(card?.display_badges ?? []), ...(outcome?.display_badges ?? [])]),
        ),
        detail:
          card?.detail ??
          (outcome?.next_actions.length ? outcome.next_actions.join(" ") : null) ??
          reasonLabel(primaryReasonCode),
        eligibleSlotCount: validated?.eligible_slot_ids.length ?? null,
        comparable:
          outcome ?? (primaryReasonCode ? { primary_reason_code: primaryReasonCode } : null),
        missingFields: validated?.missing_fields ?? [],
        suggestion: card?.suggestion
          ? { reason: card.suggestion, types: card.suggested_adjustment_types ?? [] }
          : null,
      };
    });

    // Input is checked first because an order held there never reached the
    // others.
    const review = rows.filter((r) => r.inputState === "REVIEW_REQUIRED");
    const assigned = rows.filter((r) => r.assignmentState === "ASSIGNED");
    const waiting = rows.filter(
      (r) =>
        r.inputState === "VALID" &&
        r.eligibilityState === "ELIGIBLE" &&
        r.assignmentState !== null &&
        r.assignmentState !== "ASSIGNED",
    );
    const pending = rows.filter(
      (r) =>
        r.inputState === "VALID" &&
        r.eligibilityState === "ELIGIBLE" &&
        r.assignmentState === null,
    );
    const ineligible = rows.filter(
      (r) => r.inputState === "VALID" && r.eligibilityState === "INELIGIBLE",
    );

    const placed = new Set(
      [...review, ...assigned, ...waiting, ...pending, ...ineligible].map((r) => r.orderId),
    );

    return {
      scenario,
      snapshot,
      idx,
      runId,
      run,
      validation,
      explanation,
      ai,
      cardByOrder,
      rows,
      review,
      assigned,
      waiting,
      pending,
      ineligible,
      unclassified: rows.filter((r) => !placed.has(r.orderId)),
      capacity: snapshot.baseline_service_ids
        .flatMap((id) => slotsOfService(idx, id))
        .filter((slot) => slot.available).length,
      parentId,
      parent,
      parentRun,
      derived,
    };
  },
);

/** The counts the summary bar shows, phrased for whether a run exists yet. */
export function summaryStats(view: ScenarioView) {
  return view.run
    ? ([
        { label: "배정", value: view.assigned.length, tone: "ok" },
        { label: "대기", value: view.waiting.length, tone: "warn" },
        { label: "불가", value: view.ineligible.length, tone: "bad" },
        { label: "확인 필요", value: view.review.length, tone: "muted" },
      ] as const)
    : ([
        { label: "전체 주문", value: view.rows.length },
        { label: "적합", value: view.pending.length, tone: "ok" },
        { label: "부적합", value: view.ineligible.length, tone: "bad" },
        { label: "확인 필요", value: view.review.length, tone: "muted" },
      ] as const);
}
