/**
 * 정책·시나리오 타입
 *
 * 06.1 MVP 요구사항, 06.2 도메인·상태 정의서 기준
 */

import type { SourceRef, AllowedChangeType } from "./domain";

// ─── Policy ───

export interface ObjectiveStage {
  name: string;
  direction: "MAXIMIZE" | "MINIMIZE";
  description?: string;
}

export interface AllowedAdjustment {
  change_type: AllowedChangeType;
  description: string;
  requires_approval?: boolean;
}

/** 06.2 금지 변경: 중량·치수·경로 여유·납기 한도 */
export interface ForbiddenAdjustment {
  field: string;
  reason: string;
}

export interface DisplaySortRule {
  field: string;
  direction: "ASC" | "DESC";
  description?: string;
}

export interface Policy {
  policy_id: string;
  policy_version: string;
  hard_constraints: Record<string, unknown>;
  /** 06.5 기준: 배정 건수 → 우선순위 점수 → 납기 최소 → 사전순 동률 */
  objective_order: ObjectiveStage[];
  priority_rules: Record<string, unknown>;
  display_sort_rules: DisplaySortRule[];
  allowed_adjustments: AllowedAdjustment[];
  forbidden_adjustments: ForbiddenAdjustment[];
  tie_breaker: Record<string, unknown>;
  approved_by: string;
  approved_at: string;
}

// ─── Scenario ───

export interface OrderScopeOverride {
  order_id: string;
  action: "EXCLUDE";
  reason_code: string;
  actor_id: string;
  created_at: string;
}

export interface ChangeSet {
  /** 06.2 허용 변경 유형 */
  change_type: AllowedChangeType;
  changes: {
    field: string;
    before: unknown;
    after: unknown;
  }[];
  reason: string;
}

export interface Scenario {
  scenario_id: string;
  baseline_service_ids: string[];
  order_ids: string[];
  policy_version: string;
  assumption_ids: string[];
  parent_scenario_id?: string;
  change_set?: ChangeSet;
  order_scope_overrides?: OrderScopeOverride[];
  impacted_order_ids?: string[];
  created_by: string;
  created_at: string;
  source_ref: SourceRef;
}