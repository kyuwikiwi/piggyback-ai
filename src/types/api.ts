/**
 * API 요청·응답 타입
 *
 * 06.4 API 명세서 기준
 */

import type { Order, Service, Wagon, Slot, Terminal, SourceRef } from "./domain";
import type { Scenario, ChangeSet } from "./policy";
import type {
  SolverRun,
  SolverSettings,
  ValidationReport,
  DecisionRecord,
  DecisionState,
  AssignmentDelta,
  OrderOutcome,
  ReproducibilityInfo,
} from "./result";

// ─── 시나리오 생성 ───

/** 06.4: ScenarioInputSnapshot 타입 (자유형 객체 아님) */
export interface ScenarioInputSnapshot {
  orders: Order[];
  services: Service[];
  wagons: Wagon[];
  slots: Slot[];
  terminals: Terminal[];
}

export interface CreateScenarioRequest {
  baseline_service_ids: string[];
  input_snapshot: ScenarioInputSnapshot;
  policy_version: string;
  assumption_ids: string[];
  created_by: string;
  source_ref: SourceRef;
}

export interface CreateScenarioResponse {
  scenario: Scenario;
}

// ─── 입력 검증 ───

export interface ValidateScenarioResponse {
  validation: ValidationReport;
}

// ─── 편성 계산 ───

/** 06.4: 필수 솔버 설정 (workers !== 1이면 400) */
export interface CreateRunRequest {
  solver_settings: SolverSettings;
}

export interface CreateRunResponse {
  run: SolverRun;
}

export interface GetRunResponse {
  run: SolverRun;
}

// ─── 대안 생성 (06.4: 3분기 응답) ───

export interface CreateAlternativeRequest {
  target_order_ids: string[];
  change_set: ChangeSet;
}

/** 201: 성공 대안 */
export interface AlternativeResult {
  alternative_scenario: Scenario;
  alternative_run: SolverRun;
  impacted_order_ids: string[];
  assignment_deltas: AssignmentDelta[];
}

/** 200: 허용 범위 내 대안 없음 */
export interface AlternativeUnavailableResult {
  target_order_ids: string[];
  reason: "NO_FEASIBLE_ALTERNATIVE";
  message: string;
}

/** 409: 금지 변경 */
export interface AlternativePolicyViolation {
  target_order_ids: string[];
  reason: "POLICY_VIOLATION";
  violated_field: string;
  message: string;
}

// ─── 결정 기록 ───

export interface CreateDecisionRequest {
  order_decisions: {
    order_id: string;
    decision: DecisionState;
    reason: string;
  }[];
  actor_id: string;
  actor_role: string;
  notes?: string;
}

export interface CreateDecisionResponse {
  decision: DecisionRecord;
}

// ─── Export (06.4: 재현 번들) ───

export interface ExportBundle {
  input_snapshot: ScenarioInputSnapshot;
  policy_version: string;
  run: SolverRun;
  validation: ValidationReport;
  reproducibility: ReproducibilityInfo;
}

// ─── 공통 에러 ───

export type ApiErrorCode =
  | "INVALID_INPUT"
  | "VALIDATION_REQUIRED"
  | "POLICY_VIOLATION"
  | "PLAN_VALIDATION_FAILED"
  | "RUN_NOT_ACCEPTABLE";

export interface ApiError {
  error_code: ApiErrorCode;
  message: string;
  details?: {
    field?: string;
    expected?: string;
    actual?: string;
  }[];
}