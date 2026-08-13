// 도메인
export type {
  SourceType, SourceRef, DimensionsMm,
  PriorityClass, CompatibilityTag, AllowedChangeType,
  AdjustmentWindow, Order,
  ServiceStatus, Service,
  Wagon, Slot,
  OperatingWindow, Terminal,
} from "./domain";

// 정책·시나리오
export type {
  ObjectiveStage, AllowedAdjustment, ForbiddenAdjustment,
  DisplaySortRule, Policy,
  OrderScopeOverride, ChangeSet, Scenario,
} from "./policy";

// 결과·상태
export type {
  InputState, EligibilityState, AssignmentState,
  AlternativeState, DecisionState,
  DisplayLabel, DisplayBadge,
  ReasonCode, ReasonDetail,
  RunState, ObjectiveStageStatus,
  SolverSettings, ReproducibilityInfo,
  OrderOutcome, Assignment, AssignmentDelta,
  SolverRun, DecisionRecord,
  ValidationIssue, ValidationReport,
} from "./result";

export { deriveDisplayLabel } from "./result";

// API
export type {
  ScenarioInputSnapshot,
  CreateScenarioRequest, CreateScenarioResponse,
  ValidateScenarioResponse,
  CreateRunRequest, CreateRunResponse, GetRunResponse,
  CreateAlternativeRequest,
  AlternativeResult, AlternativeUnavailableResult, AlternativePolicyViolation,
  CreateDecisionRequest, CreateDecisionResponse,
  ExportBundle,
  ApiErrorCode, ApiError,
} from "./api";