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

const labelIntent: Record<string, Intent> = {
  "확인 필요":           "amber",
  "편성 가능":           "green",
  "편성 가능·미배정":     "cyan",
  "기본안 불가·대안 미검토": "amber",
  "불가":               "red",
  "조건부 대안 있음":     "purple",
  "기준 운행":           "blue",
  "대안 운행":           "purple",
  "OPTIMAL":            "green",
  "FEASIBLE":           "amber",
  "INFEASIBLE":         "red",
  "채택":               "green",
  "보류":               "amber",
  "반려":               "red",
  "P1":                 "red",
  "P2":                 "amber",
  "P3":                 "muted",
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
  const intent = labelIntent[label] ?? "muted";
  const colors = intentStyles[intent];
  const sizing = sizeStyles[size];

  return (
    <span
      className={`inline-block font-semibold rounded-full border whitespace-nowrap ${colors} ${sizing} ${className}`}
    >
      {label}
    </span>
  );
}