/**
 * Readable names for the generated schema types.
 *
 * `components["schemas"]["Run"]` at every call site is noise, and it makes the
 * generated file's shape part of every import. This is the only module that
 * reaches into it.
 *
 * Nothing here is hand-written -- edit the backend's openapi.yaml and rerun
 * `npm run gen:api`.
 */
import type { components, paths } from "@/types/generated/api";

type Schemas = components["schemas"];

/** `/health` and `/v1/ai/status` answer with inline schemas, not named ones. */
type JsonBody<T> = T extends { content: { "application/json": infer B } } ? B : never;
export type Health = JsonBody<paths["/health"]["get"]["responses"][200]>;
export type AiStatus = JsonBody<paths["/v1/ai/status"]["get"]["responses"][200]>;

// ─── 시나리오 ───
export type Scenario = Schemas["Scenario"];
export type ScenarioDetail = Schemas["ScenarioDetail"];
export type ScenarioSummary = Schemas["ScenarioSummary"];
export type ScenarioCreateRequest = Schemas["ScenarioCreateRequest"];
export type ScenarioInputSnapshot = Schemas["ScenarioInputSnapshot"];

// ─── 스냅샷 구성요소 ───
export type Assumption = Schemas["Assumption"];
export type Shipper = Schemas["Shipper"];
export type Terminal = Schemas["Terminal"];
export type RouteConstraint = Schemas["RouteConstraint"];
export type Service = Schemas["Service"];
export type Wagon = Schemas["Wagon"];
export type Slot = Schemas["Slot"];
export type Order = Schemas["Order"];
export type Policy = Schemas["Policy"];
export type Dimensions = Schemas["Dimensions"];

// ─── 검증 ───
export type ValidationResult = Schemas["ValidationResult"];
export type OrderValidation = Schemas["OrderValidation"];

// ─── 실행 ───
export type Run = Schemas["Run"];
export type RunRequest = Schemas["RunRequest"];
export type SolverParameters = Schemas["SolverParameters"];
export type Reproducibility = Schemas["Reproducibility"];
export type Assignment = Schemas["Assignment"];
export type AssignmentDelta = Schemas["AssignmentDelta"];
export type OrderOutcome = Schemas["OrderOutcome"];
export type ValidatorFinding = Schemas["ValidatorFinding"];

// ─── 대안 ───
export type AlternativeRequest = Schemas["AlternativeRequest"];
export type AlternativeResult = Schemas["AlternativeResult"];
export type AlternativeUnavailableResult = Schemas["AlternativeUnavailableResult"];
export type ChangeSetEntry = Schemas["ChangeSetEntry"];

/**
 * `POST /v1/runs/{id}/alternatives` answers 201 with a result or 200 with a
 * refusal. Both are success statuses, so the caller has to discriminate.
 */
export type AlternativeOutcome =
  | ({ found: true } & AlternativeResult)
  | ({ found: false } & AlternativeUnavailableResult);

// ─── 결정 · export ───
export type Decision = Schemas["Decision"];
export type DecisionRequest = Schemas["DecisionRequest"];
export type ExportBundle = Schemas["ExportBundle"];
export type TraceEvent = Schemas["TraceEvent"];

// ─── 생성형 레이어 ───
export type ExplanationResult = Schemas["ExplanationResult"];
export type ExplanationCard = Schemas["ExplanationCard"];
export type IntakeResult = Schemas["IntakeResult"];
export type OrderDraft = Schemas["OrderDraft"];

// ─── 오류 ───
export type ApiErrorBody = Schemas["Error"];
export type ApiErrorDetail = Schemas["ErrorDetail"];
export type ApiErrorCode = ApiErrorBody["code"];

// ─── 상태축 (02 §4) ───
export type InputState = OrderOutcome["input_state"];
export type EligibilityState = OrderOutcome["eligibility_state"];
export type AssignmentState = OrderOutcome["assignment_state"];
export type AlternativeState = OrderOutcome["alternative_state"];
export type DecisionState = DecisionRequest["decision_state"];
export type ActorRole = DecisionRequest["actor_role"];
export type SelectedPlan = DecisionRequest["selected_plan"];
