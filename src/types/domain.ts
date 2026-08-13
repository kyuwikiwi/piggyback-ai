/**
 * 피기백 편성 AI — 핵심 도메인 모델
 *
 * 06.2 도메인·상태 정의서 기준
 *
 * 규칙:
 * - 모든 엔터티는 변경되지 않는 문자열 ID
 * - API 시간: ISO 8601 (시간대 포함)
 * - 중량: 정수 kg / 길이·폭·높이: 정수 mm
 * - compatibility_tags: 정책 vocabulary만 사용 (TRAILER_STANDARD, TRAILER_TALL)
 */

// ─── 공통 ───

export type SourceType =
  | "PUBLIC_CONFIRMED"
  | "INSTITUTION_CONFIRMED"
  | "INSTITUTION_CONFIRMATION_REQUIRED"
  | "DEMO_ASSUMPTION"
  | "DERIVED_RESULT";

export interface SourceRef {
  source_type: SourceType;
  source_name?: string;
  source_uri?: string;
  retrieved_at?: string;
  assumption_id?: string;
  approved_by?: string;
  notes?: string;
}

export interface DimensionsMm {
  length_mm: number;
  width_mm: number;
  height_mm: number;
}

// ─── Order ───

/** 06.2 우선순위: P1(최우선), P2, P3 */
export type PriorityClass = "P1" | "P2" | "P3";

/** 06.2 호환 태그 vocabulary */
export type CompatibilityTag = "TRAILER_STANDARD" | "TRAILER_TALL";

/** 06.2 허용 변경 코드 */
export type AllowedChangeType =
  | "ADD_ORDER_APPROVED_SERVICE"
  | "CHANGE_TO_APPROVED_TERMINAL";

export interface AdjustmentWindow {
  earliest_ready_at?: string;
  latest_ready_at?: string;
  alternative_origin_terminal_ids?: string[];
  alternative_destination_terminal_ids?: string[];
  /** 허용된 변경 유형 */
  allowed_changes?: AllowedChangeType[];
  adjustment_cost?: number;
  approval_ref?: string;
}

export interface Order {
  order_id: string;
  origin_terminal_ids: string[];
  destination_terminal_ids: string[];
  ready_at: string | null;
  due_at: string;
  gross_weight_kg: number | null; // null이면 REVIEW_REQUIRED
  dimensions_mm: DimensionsMm;
  compatibility_tags: CompatibilityTag[];
  priority_class: PriorityClass;
  adjustment_window?: AdjustmentWindow;
  source_ref: SourceRef;
}

// ─── Service ───

export type ServiceStatus = "PLANNED" | "AVAILABLE" | "UNAVAILABLE" | "CANCELLED";

export interface Service {
  service_id: string;
  origin_terminal_id: string;
  destination_terminal_id: string;
  departure_at: string;
  arrival_at: string;
  planning_cutoff_at: string;
  wagon_ids: string[];
  status: ServiceStatus;
}

// ─── Wagon & Slot ───

export interface Wagon {
  wagon_id: string;
  service_id: string;
  max_weight_kg: number;
  slot_ids: string[];
  compatibility_tags: CompatibilityTag[];
  available: boolean;
}

export interface Slot {
  slot_id: string;
  wagon_id: string;
  max_weight_kg: number;
  max_dimensions_mm: DimensionsMm;
  compatibility_tags: CompatibilityTag[];
  position: number;
  available: boolean;
  /** 경로 높이 한도 (mm) — 06.3 기준 4,000mm */
  route_height_limit_mm?: number;
}

// ─── Terminal ───

export interface OperatingWindow {
  day_of_week?: number[];
  open_time: string;
  close_time: string;
}

export interface Terminal {
  terminal_id: string;
  operating_windows: OperatingWindow[];
  intake_cutoff_rule: string;
  minimum_handling_minutes: number;
  supported_tags: CompatibilityTag[];
  unavailable_periods?: { from: string; to: string }[];
  source_ref: SourceRef;
}