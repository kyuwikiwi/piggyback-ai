import type { DecisionRecord } from "@/types";

export const decisionRecord: DecisionRecord = {
  decision_id: "DEC-001",
  run_id: "RUN-20260813-001",
  scenario_id: "SCN-DEMO-001",
  order_decisions: [
    { order_id: "ORD-001", decision: "ACCEPTED", reason: "기본안 배정 승인" },
    { order_id: "ORD-002", decision: "ACCEPTED", reason: "기본안 배정 승인" },
    { order_id: "ORD-003", decision: "ACCEPTED", reason: "기본안 배정 승인" },
    { order_id: "ORD-004", decision: "HELD", reason: "슬롯 경합 — 추가 슬롯 확보 후 재검토" },
    { order_id: "ORD-005", decision: "ACCEPTED", reason: "다음 운행 SVC-NEXT-01 대안 채택" },
    { order_id: "ORD-006", decision: "HELD", reason: "총중량 보완 후 재검토" },
    { order_id: "ORD-007", decision: "REJECTED", reason: "높이 초과 — 대안 없음" },
    { order_id: "ORD-008", decision: "ACCEPTED", reason: "대체 터미널 TRM-C 경유 대안 채택" },
    { order_id: "ORD-009", decision: "REJECTED", reason: "납기 초과 — 대안 없음" },
  ],
  actor_id: "OPR-DEMO",
  actor_role: "편성 운영자",
  decided_at: "2026-08-13T10:30:00+09:00",
  policy_version: "DEMO_POLICY_V1",
  notes: "정본 시나리오 v1 최종 결정",
};

export const axisRows = [
  { id: "ORD-001", input: "VALID", eligibility: "ELIGIBLE", assignment: "ASSIGNED", alternative: "—", decision: "ACCEPTED" },
  { id: "ORD-002", input: "VALID", eligibility: "ELIGIBLE", assignment: "ASSIGNED", alternative: "—", decision: "ACCEPTED" },
  { id: "ORD-003", input: "VALID", eligibility: "ELIGIBLE", assignment: "ASSIGNED", alternative: "—", decision: "ACCEPTED" },
  { id: "ORD-004", input: "VALID", eligibility: "ELIGIBLE", assignment: "UNASSIGNED", alternative: "—", decision: "HELD" },
  { id: "ORD-005", input: "VALID", eligibility: "INELIGIBLE*", assignment: "N/A", alternative: "AVAILABLE", decision: "ACCEPTED" },
  { id: "ORD-006", input: "REVIEW", eligibility: "NOT_EVAL", assignment: "N/A", alternative: "—", decision: "HELD" },
  { id: "ORD-007", input: "VALID", eligibility: "INELIGIBLE", assignment: "N/A", alternative: "NONE", decision: "REJECTED" },
  { id: "ORD-008", input: "VALID", eligibility: "INELIGIBLE*", assignment: "N/A", alternative: "AVAILABLE", decision: "ACCEPTED" },
  { id: "ORD-009", input: "VALID", eligibility: "INELIGIBLE", assignment: "N/A", alternative: "NONE", decision: "REJECTED" },
] as const;

export const axisColors: Record<string, string> = {
  VALID: "text-emerald-600",
  REVIEW: "text-amber-600",
  ELIGIBLE: "text-emerald-600",
  "INELIGIBLE*": "text-cyan-600",
  INELIGIBLE: "text-red-600",
  NOT_EVAL: "text-amber-600",
  ASSIGNED: "text-emerald-600",
  UNASSIGNED: "text-cyan-600",
  "N/A": "text-gray-400",
  "—": "text-gray-400",
  AVAILABLE: "text-violet-600",
  NONE: "text-red-600",
  ACCEPTED: "text-emerald-600",
  HELD: "text-amber-600",
  REJECTED: "text-red-600",
};