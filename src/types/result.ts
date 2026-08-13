/**
 * 편성 결과·상태 타입
 *
 * 06.1 MVP 요구사항, 06.2 도메인·상태, 06.4 API, 06.7 테스트케이스 기준
 */

// ─── 5축 상태 체계 ───

export type InputState = "VALID" | "REVIEW_REQUIRED";
export type EligibilityState = "ELIGIBLE" | "INELIGIBLE" | "NOT_EVALUATED";
export type AssignmentState = "ASSIGNED" | "UNASSIGNED" | "NOT_APPLICABLE";
export type AlternativeState = "AVAILABLE" | "NONE" | "NOT_SEARCHED";

/** 06.2: DRAFT 제거, ACCEPTED/HELD/REJECTED만 사용 */
export type DecisionState = "ACCEPTED" | "HELD" | "REJECTED";

// ─── 표시 라벨 ───

export type DisplayLabel =
  | "확인 필요"
  | "편성 가능"
  | "편성 가능·미배정"
  | "기본안 불가·대안 미검토"
  | "불가";

export type DisplayBadge = "조건부 대안 있음";

export function deriveDisplayLabel(
  input: InputState,
  eligibility: EligibilityState,
  assignment: AssignmentState,
  alternative: AlternativeState,
): { label: DisplayLabel; badges: DisplayBadge[] } {
  const badges: DisplayBadge[] = [];

  if (input === "REVIEW_REQUIRED") {
    return { label: "확인 필요", badges };
  }
  if (alternative === "AVAILABLE") {
    badges.push("조건부 대안 있음");
  }
  if (eligibility === "ELIGIBLE" && assignment === "ASSIGNED") {
    return { label: "편성 가능", badges };
  }
  if (eligibility === "ELIGIBLE" && assignment === "UNASSIGNED") {
    return { label: "편성 가능·미배정", badges };
  }
  if (eligibility === "INELIGIBLE" && alternative === "NOT_SEARCHED") {
    return { label: "기본안 불가·대안 미검토", badges };
  }
  if (eligibility === "INELIGIBLE" && alternative === "NONE") {
    return { label: "불가", badges };
  }
  if (eligibility === "INELIGIBLE" && alternative === "AVAILABLE") {
    return { label: "기본안 불가·대안 미검토", badges };
  }

  return { label: "확인 필요", badges };
}

// ─── 사유 코드 ───

export type ReasonCode =
  // 입력
  | "MISSING_REQUIRED_FIELD"
  | "INVALID_UNIT"
  | "INVALID_REFERENCE"
  | "TIME_CONTRADICTION"
  // 시간
  | "READY_AFTER_CUTOFF"
  | "DUE_TIME_EXCEEDED"
  | "ARRIVAL_AFTER_DUE"
  | "INSUFFICIENT_HANDLING_TIME"
  // 경로·규격
  | "ROUTE_ORIGIN_MISMATCH"
  | "ROUTE_DESTINATION_MISMATCH"
  | "SERVICE_ROUTE_MISMATCH"
  | "TUNNEL_HEIGHT_EXCEEDED"
  | "DIMENSION_LENGTH_EXCEEDED"
  | "DIMENSION_WIDTH_EXCEEDED"
  | "SLOT_WEIGHT_EXCEEDED"
  | "WAGON_WEIGHT_EXCEEDED"
  // 터미널
  | "TERMINAL_NOT_COMPATIBLE"
  | "TERMINAL_OUTSIDE_OPERATING_HOURS"
  // 자원
  | "SERVICE_UNAVAILABLE"
  | "WAGON_UNAVAILABLE"
  | "SLOT_UNAVAILABLE"
  // 경합
  | "CAPACITY_CONFLICT"
  // 대안
  | "ALTERNATIVE_NOT_SEARCHED"
  | "ALTERNATIVE_AVAILABLE"
  | "ALTERNATIVE_NONE"
  | "NO_FEASIBLE_ALTERNATIVE"
  // 정책
  | "POLICY_VIOLATION"
  | "CHANGE_ROUTE_CLEARANCE"
  // 솔버
  | "SOLVER_TIME_LIMIT"
  | "SOLVER_INFEASIBLE"
  | "SOLVER_ERROR"
  // 승인
  | "RUN_NOT_ACCEPTABLE";

export interface ReasonDetail {
  code: ReasonCode;
  message: string;
  field?: string;
  expected?: string;
  actual?: string;
}

// ─── 솔버 실행 상태 ───

export type RunState =
  | "SOLVED_OPTIMAL"
  | "SOLVED_FEASIBLE"
  | "MODEL_INFEASIBLE"
  | "RUN_ERROR"
  | "RUN_REVIEW_REQUIRED";

export interface ObjectiveStageStatus {
  name: string;
  status: "OPTIMAL" | "FEASIBLE" | "INFEASIBLE";
  value?: number;
  best_bound?: number;
}

/** 06.4, 06.5: 필수 솔버 설정 */
export interface SolverSettings {
  random_seed: number;      // 고정값 7
  num_search_workers: number; // 고정값 1
  max_time_seconds: number;   // 고정값 10
}

/** 06.4: 재현성 해시 */
export interface ReproducibilityInfo {
  solver_settings: SolverSettings;
  input_hash: string;    // SHA-256
  policy_hash: string;   // SHA-256
  result_hash: string;   // SHA-256
}

// ─── 주문 결과 ───

export interface OrderOutcome {
  order_id: string;
  input_state: InputState;
  eligibility_state: EligibilityState;
  assignment_state: AssignmentState;
  alternative_state: AlternativeState;
  display_label: DisplayLabel;
  display_badges: DisplayBadge[];
  alternative_scenario_ids: string[];
  assigned_slot_id: string | null;
  assigned_wagon_id?: string | null;
  assigned_service_id?: string | null;
  primary_reason_code: ReasonCode | null;
  reason_codes: ReasonCode[];
  reason_details: ReasonDetail[];
  evidence: Record<string, unknown>;
  next_actions: string[];
  assumption_ids: string[];
}

// ─── 배정 ───

export interface Assignment {
  order_id: string;
  service_id: string;
  wagon_id: string;
  slot_id: string;
}

/** 06.4: 대안의 배정 차이 */
export interface AssignmentDelta {
  order_id: string;
  before: { service_id: string; wagon_id: string; slot_id: string } | null;
  after: { service_id: string; wagon_id: string; slot_id: string } | null;
}

// ─── 실행 결과 ───

export interface SolverRun {
  run_id: string;
  scenario_id: string;
  policy_version: string;
  run_state: RunState;
  is_optimal: boolean;
  objective_stage_statuses: ObjectiveStageStatus[];
  objective_values: Record<string, number>;
  assignments: Assignment[];
  order_outcomes: OrderOutcome[];
  validator_status: "PASS" | "FAIL";
  assumption_ids: string[];
  /** 06.4: 재현성 정보 */
  reproducibility: ReproducibilityInfo;
  wall_time_ms?: number;
  created_at: string;
}

// ─── 결정 기록 ───

export interface DecisionRecord {
  decision_id: string;
  run_id: string;
  scenario_id: string;
  order_decisions: {
    order_id: string;
    decision: DecisionState;
    reason: string;
  }[];
  actor_id: string;
  actor_role: string;
  decided_at: string;
  policy_version: string;
  notes?: string;
}

// ─── 검증 결과 ───

export interface ValidationIssue {
  order_id?: string;
  field: string;
  code: ReasonCode;
  message: string;
  expected?: string;
  actual?: string;
  severity: "ERROR" | "WARNING";
}

export interface ValidationReport {
  scenario_id: string;
  total_orders: number;
  valid_count: number;
  review_required_count: number;
  issues: ValidationIssue[];
  created_at: string;
}