/**
 * Korean labels for the reason-code vocabulary.
 *
 * The codes are the service's (backend `app/rules/reason_codes.py`); the
 * wording is this app's, which is why it lives here and not in the contract.
 * The service already sends prose in `next_actions` and in the explanation
 * cards -- that prose is preferred wherever it is available. These are the
 * short chips shown next to a code.
 *
 * An unmapped code renders as the raw code rather than as a blank or a guess.
 * Falling back to the code is ugly on purpose: it is a visible signal that the
 * vocabulary grew and this map did not.
 */
const REASON_LABELS: Record<string, string> = {
  // 입력
  MISSING_REQUIRED_FIELD: "필수 항목 누락",
  INVALID_TIME_RANGE: "시간 범위 모순",
  // 시간
  READY_AFTER_CUTOFF: "반입 마감 초과",
  DUE_TIME_EXCEEDED: "납기 초과",
  // 경로·터미널
  TERMINAL_NOT_COMPATIBLE: "터미널 취급 불가",
  TERMINAL_NOT_ON_SERVICE_ROUTE: "운행 경로에 없는 터미널",
  TUNNEL_HEIGHT_EXCEEDED: "경로 높이 한도 초과",
  ROUTE_WIDTH_EXCEEDED: "경로 폭 한도 초과",
  ROUTE_WEIGHT_EXCEEDED: "경로 중량 한도 초과",
  // 슬롯·화차 규격
  SLOT_HEIGHT_EXCEEDED: "슬롯 높이 초과",
  SLOT_WIDTH_EXCEEDED: "슬롯 폭 초과",
  SLOT_LENGTH_EXCEEDED: "슬롯 길이 초과",
  SLOT_WEIGHT_EXCEEDED: "슬롯 중량 초과",
  SLOT_TAG_NOT_SUPPORTED: "슬롯 호환 태그 불일치",
  WAGON_WEIGHT_EXCEEDED: "화차 중량 초과",
  // 자원
  SERVICE_UNAVAILABLE: "운행 사용 불가",
  WAGON_UNAVAILABLE: "화차 사용 불가",
  SLOT_UNAVAILABLE: "슬롯 사용 불가",
  NO_ELIGIBLE_SLOT: "적합 슬롯 없음",
  // 경합·배정
  CAPACITY_CONFLICT: "슬롯 경합",
  ASSIGNED: "배정됨",
  // 대안
  ALTERNATIVE_AVAILABLE: "조건부 대안 있음",
  NO_FEASIBLE_ALTERNATIVE: "실행 가능한 대안 없음",
  ALTERNATIVE_REQUIRES_FORBIDDEN_CHANGE: "금지된 변경이 필요",
};

export function reasonLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return REASON_LABELS[code] ?? code;
}

/**
 * Codes a time axis can actually account for.
 *
 * The timeline draws every order, including the ones that failed on height or
 * on a terminal's handling tags. Those bars look perfectly healthy against the
 * cutoff and the arrival, because they are -- nothing about their cause is a
 * time. Left unmarked, a viewer learns "red bar = late", which is wrong for half
 * the canonical fixture. The screen marks them instead of quietly implying it.
 */
const TIME_REASON_CODES = new Set([
  "READY_AFTER_CUTOFF",
  "DUE_TIME_EXCEEDED",
  "INVALID_TIME_RANGE",
]);

export function isTimeReason(code: string | null | undefined): boolean {
  return code !== null && code !== undefined && TIME_REASON_CODES.has(code);
}

/** Whether a code is one this app has wording for. Used to warn in development. */
export function isKnownReasonCode(code: string): boolean {
  return code in REASON_LABELS;
}
