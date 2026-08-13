const intentStyles = {
  ok: "border-ok-line bg-ok-bg text-ok",
  warn: "border-warn-line bg-warn-bg text-warn",
  bad: "border-bad-line bg-bad-bg text-bad",
  info: "border-korail-blue/25 bg-korail-blue/5 text-korail-blue",
  neutral: "border-line-strong bg-sunken text-ink-2",
} as const;

type Intent = keyof typeof intentStyles;

/**
 * Every label this app is allowed to badge.
 *
 * Two vocabularies meet here: the service's enums, which arrive verbatim, and
 * this app's own Korean wording. Both are listed so an unknown label is a real
 * signal rather than a styling gap -- see the warning in the component.
 *
 * 어휘 다섯 개뿐이다. 예전에는 보라와 청록이 더 있었는데, 초록·노랑·빨강이 이미
 * 판정을 뜻하는 화면에서 뜻 없는 색이 둘 더 돌아다니면 색 자체가 신호이길 그만둔다.
 *
 * 초록은 판정에만 쓴다. `SOLVED`·`COMPLETED` 같은 생애주기 값은 중립이다 — 머리말에
 * `SOLVED` `OPTIMAL` `PASS`가 나란히 초록으로 서 있으면, 정작 확인해야 하는
 * 독립 검증 결과가 나머지 둘에 묻힌다.
 */
const labelIntent: Record<string, Intent> = {
  // 표시 라벨 (02 §4) — 서비스가 계산해서 내려주는 값
  "확인 필요": "warn",
  "편성 가능": "ok",
  "편성 가능·미배정": "info",
  "기본안 불가·대안 미검토": "warn",
  // INELIGIBLE + AVAILABLE. Amber rather than red on purpose: the baseline
  // cannot carry this order, but an approved change can, and the row already
  // carries `조건부 대안 있음` beside it. Red here would say the opposite of
  // the badge next to it.
  "기본안 불가": "warn",
  불가: "bad",
  "조건부 대안 있음": "info",

  // 시나리오 상태 — 어디까지 진행했는지일 뿐, 좋고 나쁨이 아니다
  VALIDATION_REQUIRED: "warn",
  READY_TO_SOLVE: "neutral",
  SOLVED: "neutral",

  // 검증 상태
  COMPLETED: "neutral",
  FAILED: "bad",
  PASS: "ok",
  FAIL: "bad",

  // 솔버
  OPTIMAL: "ok",
  FEASIBLE: "warn",
  INFEASIBLE: "bad",
  UNKNOWN: "neutral",
  SOLVED_OPTIMAL: "ok",
  SOLVED_FEASIBLE: "warn",
  MODEL_INFEASIBLE: "bad",
  RUN_ERROR: "bad",
  RUN_REVIEW_REQUIRED: "warn",

  // 결정
  ACCEPTED: "ok",
  HELD: "warn",
  REJECTED: "bad",
  채택: "ok",
  보류: "warn",
  반려: "bad",

  // 화면 자체 어휘
  연결됨: "ok",
  "연결 안 됨": "bad",
  "기준 운행": "neutral",
  "대안 운행": "info",
  유효: "ok",
  적합: "ok",
  부적합: "bad",
  미평가: "neutral",
  P1: "neutral",
  P2: "neutral",
  P3: "neutral",
};

const sizeStyles = {
  sm: "text-[12px] px-2 py-0.5",
  md: "text-[13px] px-2.5 py-0.5",
} as const;

type Size = keyof typeof sizeStyles;

interface StatusBadgeProps {
  label: string;
  size?: Size;
  className?: string;
}

export function StatusBadge({ label, size = "md", className = "" }: StatusBadgeProps) {
  const known = label in labelIntent;

  // Falling back silently to grey is how a badge keeps rendering after the
  // service starts sending a value this app has no wording for -- it looks
  // deliberate and nobody notices. In development, say so.
  if (!known && process.env.NODE_ENV !== "production") {
    console.warn(
      `StatusBadge: no intent for ${JSON.stringify(label)}. Add it to labelIntent, or stop passing it.`,
    );
  }

  const colors = intentStyles[known ? labelIntent[label] : "neutral"];

  return (
    <span
      className={`inline-block rounded-md border font-medium whitespace-nowrap ${colors} ${sizeStyles[size]} ${className}`}
    >
      {label}
    </span>
  );
}
