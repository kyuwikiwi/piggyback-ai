/**
 * Evidence for an alternative, computed from the alternative scenario itself.
 *
 * The old screen showed six hand-written check rows ("반입 마감 통과 · 준비 11:00
 * → 마감 16:30") that were literal strings in a fixture. Nothing produced them
 * and nothing could contradict them -- they would have kept saying 통과 after
 * the underlying values changed.
 *
 * Each row here is recomputed from the derived snapshot the alternative run
 * actually solved, which `GET /v1/scenarios/{id}` now makes readable. A row
 * whose inputs are missing is dropped rather than shown as passing: the screen
 * may show less than it used to, but never more than it knows.
 */
import type { AlternativeResult, ScenarioInputSnapshot } from "@/lib/api";
import { formatMm, formatTime, formatTonnes } from "./format";
import { indexSnapshot, routeLimitsOfService, terminalName } from "./snapshot";

export interface AlternativeCheck {
  icon: string;
  label: string;
  detail: string;
  status: "pass" | "warn" | "fail";
}

export interface AlternativeView {
  orderId: string;
  serviceId: string | null;
  slotId: string | null;
  departureAt: string | null;
  arrivalAt: string | null;
  cutoffAt: string | null;
  destinationName: string | null;
  checks: AlternativeCheck[];
  impactedOrderIds: string[];
  validatorStatus: AlternativeResult["validator_status"];
}

function verdict(ok: boolean): "pass" | "fail" {
  return ok ? "pass" : "fail";
}

export function buildAlternativeView(
  result: AlternativeResult,
  alternativeSnapshot: ScenarioInputSnapshot,
): AlternativeView {
  const idx = indexSnapshot(alternativeSnapshot);
  const orderId = result.alternative_run_order_outcome.order_id;
  const order = idx.orderById.get(orderId);

  const delta = result.assignment_deltas.find((d) => d.order_id === orderId);
  const after = delta?.after_assignment ?? null;
  const service = after ? idx.serviceById.get(after.service_id) : undefined;
  const slot = after ? idx.slotById.get(after.slot_id) : undefined;
  const destination = service ? idx.terminalById.get(service.destination_terminal_id) : undefined;
  const limits = service ? routeLimitsOfService(idx, service.service_id) : undefined;

  const checks: AlternativeCheck[] = [];

  if (order?.ready_at && service?.planning_cutoff_at) {
    const ok = new Date(order.ready_at) <= new Date(service.planning_cutoff_at);
    checks.push({
      icon: "⏰",
      label: ok ? "반입 마감 통과" : "반입 마감 초과",
      detail: `준비 ${formatTime(order.ready_at)} → 마감 ${formatTime(service.planning_cutoff_at)}`,
      status: verdict(ok),
    });
  }

  if (order?.gross_weight_kg != null && slot) {
    const ok = order.gross_weight_kg <= slot.max_weight_kg;
    checks.push({
      icon: "⚖️",
      label: ok ? "중량 적합" : "중량 초과",
      detail: `${formatTonnes(order.gross_weight_kg)} ≤ 슬롯 한도 ${formatTonnes(slot.max_weight_kg)}`,
      status: verdict(ok),
    });
  }

  if (order && limits) {
    const ok = order.dimensions_mm.height <= limits.max_height_mm;
    checks.push({
      icon: "📐",
      label: ok ? "규격 적합" : "경로 높이 초과",
      detail: `${formatMm(order.dimensions_mm.height)} ≤ 경로 한도 ${formatMm(limits.max_height_mm)}`,
      status: verdict(ok),
    });
  }

  if (order?.due_at && service?.arrival_at && destination) {
    // 02 §5: 납기는 도착에 도착 터미널 처리시간을 더해서 본다.
    const readyForPickup = new Date(service.arrival_at);
    readyForPickup.setMinutes(
      readyForPickup.getMinutes() + destination.minimum_handling_minutes,
    );
    const ok = readyForPickup <= new Date(order.due_at);
    checks.push({
      icon: "📅",
      label: ok ? "납기 충족" : "납기 초과",
      detail: `도착 ${formatTime(service.arrival_at)} + 처리 ${destination.minimum_handling_minutes}분 ≤ 납기 ${formatTime(order.due_at)}`,
      status: verdict(ok),
    });
  }

  if (order && destination) {
    const unsupported = order.compatibility_tags.filter(
      (tag) => !destination.supported_tags.includes(tag),
    );
    checks.push({
      icon: "🏭",
      label: unsupported.length === 0 ? "터미널 호환" : "터미널 취급 불가",
      detail:
        unsupported.length === 0
          ? `${destination.display_name} ${order.compatibility_tags.join(", ")} 취급 가능`
          : `${destination.display_name}에서 ${unsupported.join(", ")} 취급 불가`,
      status: verdict(unsupported.length === 0),
    });
  }

  checks.push({
    icon: "🔍",
    label: result.validator_status === "PASS" ? "독립 검증 통과" : "독립 검증 실패",
    detail:
      result.validator_status === "PASS"
        ? "솔버와 별개의 재검산에서 위반이 없습니다"
        : "재검산이 위반을 보고했습니다",
    status: verdict(result.validator_status === "PASS"),
  });

  return {
    orderId,
    serviceId: after?.service_id ?? null,
    slotId: after?.slot_id ?? null,
    departureAt: service?.departure_at ?? null,
    arrivalAt: service?.arrival_at ?? null,
    cutoffAt: service?.planning_cutoff_at ?? null,
    destinationName: service ? terminalName(idx, service.destination_terminal_id) : null,
    checks,
    impactedOrderIds: result.impacted_order_ids,
    validatorStatus: result.validator_status,
  };
}

/** Human wording for one approved change. */
export function describeChange(
  change: AlternativeResult["change_set"][number],
): { code: string; text: string } {
  if (change.type === "ADD_ORDER_APPROVED_SERVICE") {
    return { code: change.type, text: `승인된 운행 ${change.service_id} 추가` };
  }
  return {
    code: change.type,
    text: `승인된 대체 터미널 ${change.destination_terminal_id}로 변경`,
  };
}
