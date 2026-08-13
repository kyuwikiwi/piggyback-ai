/**
 * The two values behind a reason code, for the codes that compare two values.
 *
 * The verdict is the service's. `eligibility_state` and `primary_reason_code`
 * arrive decided and nothing here revisits them. What this module does is locate
 * the pair of snapshot values the service measured, so a screen can show
 * `준비 11:00 → 마감 10:30 · 30분 초과` instead of the bare chip `반입 마감 초과`.
 * The chip names the rule; the pair is what lets an operator judge how far off it
 * was and whether the next service would carry it.
 *
 * Every value returned is read from the snapshot. The only arithmetic is the
 * arithmetic the service itself performs -- destination handling added to
 * arrival (backend `app/rules/eligibility.py:253`) and the size of the gap.
 *
 * A code with no entry returns null and the caller falls back to the label
 * alone. That is the normal case, not a defect: the vocabulary has 20+ codes and
 * only some of them are two numbers being compared.
 */
import type { Order } from "@/lib/api";
import { formatMm, formatTime, formatTonnes } from "./format";
import { routeLimitsOfService, terminalName, type SnapshotIndex } from "./snapshot";

export interface ComparisonTerm {
  label: string;
  value: string;
}

/**
 * What this module needs from a verdict, which is less than a full `OrderOutcome`.
 *
 * A scenario can be read back before it has a run, and then the only verdict
 * available is the validation result -- same reason codes, no `by_service`
 * evidence. Narrowing the parameter lets that path show comparisons too instead
 * of falling back to bare chips.
 */
export interface ComparableOutcome {
  primary_reason_code: string | null;
  evidence?: { [key: string]: unknown };
}

export interface ConstraintComparison {
  code: string;
  /** Whose cutoff, whose route, whose terminal -- never left implicit. */
  serviceId: string;
  /** The order's side of the comparison, plus any term the service adds to it. */
  actual: ComparisonTerm[];
  /** The limit it was measured against. */
  limit: ComparisonTerm;
  /** How far over, when the two sides are numbers and the gap is real. */
  excess: string | null;
}

/**
 * The service whose check produced this code.
 *
 * `evidence.by_service` is declared open in the contract ("read defensively"),
 * so every step is guarded. Falling back to the baseline works only when there
 * is exactly one: with two services in the baseline, printing `마감 10:30`
 * without knowing whose cutoff that is would be worse than printing nothing.
 */
function serviceIdForCode(outcome: ComparableOutcome, idx: SnapshotIndex): string | null {
  const byService = (outcome.evidence as { by_service?: unknown } | undefined)?.by_service;

  if (byService && typeof byService === "object") {
    for (const [serviceId, detail] of Object.entries(byService as Record<string, unknown>)) {
      const violations = (detail as { service_violations?: unknown } | null)?.service_violations;
      if (Array.isArray(violations) && violations.includes(outcome.primary_reason_code)) {
        return serviceId;
      }
    }
  }

  const baseline = idx.snapshot.baseline_service_ids;
  return baseline.length === 1 ? baseline[0] : null;
}

function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours && minutes) return `${hours}시간 ${minutes}분`;
  if (hours) return `${hours}시간`;
  return `${minutes}분`;
}

/**
 * The overage, or null when these two numbers do not show one.
 *
 * A non-positive gap means this module and the service read the same snapshot
 * differently. The verdict stays the service's either way -- the screen keeps
 * showing INELIGIBLE and simply drops the chip, rather than printing
 * `-30분 초과` and inviting the operator to trust the arithmetic over the rule.
 */
function overBy(actual: number, limit: number, unit: (over: number) => string): string | null {
  const over = actual - limit;

  if (over <= 0) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `constraints: the service rejected this order but the snapshot values do not exceed the limit (${actual} vs ${limit}). Showing the values without an overage.`,
      );
    }
    return null;
  }

  return `${unit(over)} 초과`;
}

const overMinutes = (over: number) => formatMinutes(Math.round(over / 60000));
const overMm = (over: number) => formatMm(over);
const overKg = (over: number) => formatTonnes(over);

export function constraintComparison(
  idx: SnapshotIndex,
  outcome: ComparableOutcome | null | undefined,
  order: Order | undefined,
): ConstraintComparison | null {
  const code = outcome?.primary_reason_code;
  if (!order || !outcome || !code) return null;

  const serviceId = serviceIdForCode(outcome, idx);
  if (!serviceId) return null;

  const service = idx.serviceById.get(serviceId);
  if (!service) return null;

  const base = { code, serviceId };

  switch (code) {
    case "READY_AFTER_CUTOFF": {
      const ready = Date.parse(order.ready_at);
      const cutoff = Date.parse(service.planning_cutoff_at);
      return {
        ...base,
        actual: [{ label: "준비", value: formatTime(order.ready_at) }],
        limit: { label: "반입 마감", value: formatTime(service.planning_cutoff_at) },
        excess: overBy(ready, cutoff, overMinutes),
      };
    }

    case "DUE_TIME_EXCEEDED": {
      // Handling at the destination counts against the due time, so arrival
      // alone is not the number the service compared. Showing only arrival
      // would read as a pass on any order whose gap is under the handling time.
      const destination = idx.terminalById.get(service.destination_terminal_id);
      const handling = destination?.minimum_handling_minutes ?? 0;
      const handedOver = Date.parse(service.arrival_at) + handling * 60_000;

      return {
        ...base,
        actual: [
          { label: "도착", value: formatTime(service.arrival_at) },
          { label: "하역", value: `${handling}분` },
        ],
        limit: { label: "납기", value: formatTime(order.due_at) },
        excess: overBy(handedOver, Date.parse(order.due_at), overMinutes),
      };
    }

    case "TUNNEL_HEIGHT_EXCEEDED": {
      const route = routeLimitsOfService(idx, serviceId);
      if (!route) return null;
      return {
        ...base,
        actual: [{ label: "높이", value: formatMm(order.dimensions_mm.height) }],
        limit: { label: "경로 한도", value: formatMm(route.max_height_mm) },
        excess: overBy(order.dimensions_mm.height, route.max_height_mm, overMm),
      };
    }

    case "ROUTE_WIDTH_EXCEEDED": {
      const route = routeLimitsOfService(idx, serviceId);
      if (!route) return null;
      return {
        ...base,
        actual: [{ label: "폭", value: formatMm(order.dimensions_mm.width) }],
        limit: { label: "경로 한도", value: formatMm(route.max_width_mm) },
        excess: overBy(order.dimensions_mm.width, route.max_width_mm, overMm),
      };
    }

    case "ROUTE_WEIGHT_EXCEEDED": {
      const route = routeLimitsOfService(idx, serviceId);
      if (!route || order.gross_weight_kg === null) return null;
      return {
        ...base,
        actual: [{ label: "중량", value: formatTonnes(order.gross_weight_kg) }],
        limit: { label: "경로 한도", value: formatTonnes(route.max_weight_kg) },
        excess: overBy(order.gross_weight_kg, route.max_weight_kg, overKg),
      };
    }

    case "TERMINAL_NOT_COMPATIBLE": {
      // The service checks both ends (backend `_check_service`), so the screen
      // has to say which end refused rather than naming one and hoping.
      const refusing = [service.origin_terminal_id, service.destination_terminal_id]
        .map((id) => idx.terminalById.get(id))
        .find(
          (terminal) =>
            terminal !== undefined &&
            !order.compatibility_tags.every((tag) => terminal.supported_tags.includes(tag)),
        );
      if (!refusing) return null;

      return {
        ...base,
        actual: [{ label: "주문 규격", value: order.compatibility_tags.join(", ") }],
        limit: {
          label: `${terminalName(idx, refusing.terminal_id)} 취급`,
          value: refusing.supported_tags.join(", "),
        },
        excess: null,
      };
    }

    default:
      return null;
  }
}
