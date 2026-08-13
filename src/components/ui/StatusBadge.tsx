const intentStyles = {
  green:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber:  "bg-amber-50 text-amber-700 border-amber-200",
  red:    "bg-red-50 text-red-700 border-red-200",
  blue:   "bg-blue-50 text-blue-700 border-blue-200",
  purple: "bg-violet-50 text-violet-700 border-violet-200",
  cyan:   "bg-cyan-50 text-cyan-700 border-cyan-200",
  muted:  "bg-gray-100 text-gray-500 border-gray-200",
} as const;

type Intent = keyof typeof intentStyles;

/**
 * Every label this app is allowed to badge.
 *
 * Two vocabularies meet here: the service's enums, which arrive verbatim, and
 * this app's own Korean wording. Both are listed so an unknown label is a real
 * signal rather than a styling gap -- see the warning in the component.
 */
const labelIntent: Record<string, Intent> = {
  // 표시 라벨 (02 §4) — 서비스가 계산해서 내려주는 값
  "확인 필요": "amber",
  "편성 가능": "green",
  "편성 가능·미배정": "cyan",
  "기본안 불가·대안 미검토": "amber",
  불가: "red",
  "조건부 대안 있음": "purple",

  // 시나리오 상태
  VALIDATION_REQUIRED: "amber",
  READY_TO_SOLVE: "blue",
  SOLVED: "green",

  // 검증 상태
  COMPLETED: "green",
  FAILED: "red",
  PASS: "green",
  FAIL: "red",

  // 솔버
  OPTIMAL: "green",
  FEASIBLE: "amber",
  INFEASIBLE: "red",
  UNKNOWN: "muted",
  SOLVED_OPTIMAL: "green",
  SOLVED_FEASIBLE: "amber",
  MODEL_INFEASIBLE: "red",
  RUN_ERROR: "red",
  RUN_REVIEW_REQUIRED: "amber",

  // 결정
  ACCEPTED: "green",
  HELD: "amber",
  REJECTED: "red",
  채택: "green",
  보류: "amber",
  반려: "red",

  // 화면 자체 어휘
  "기준 운행": "blue",
  "대안 운행": "purple",
  유효: "green",
  적합: "green",
  부적합: "red",
  미평가: "muted",
  P1: "red",
  P2: "amber",
  P3: "muted",
};

const sizeStyles = {
  sm: "text-[11px] px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
  lg: "text-sm px-3 py-1.5",
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

  const colors = intentStyles[known ? labelIntent[label] : "muted"];
  const sizing = sizeStyles[size];

  return (
    <span
      className={`inline-block font-semibold rounded-full border whitespace-nowrap ${colors} ${sizing} ${className}`}
    >
      {label}
    </span>
  );
}
