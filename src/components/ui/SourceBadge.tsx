import type { Assumption } from "@/lib/api";

/** The vocabulary the contract allows on an assumption. */
type SourceType = Assumption["source_type"];

const sourceConfig: Record<SourceType, { label: string; icon: string; className: string }> = {
  PUBLIC_CONFIRMED: {
    label: "공개 확인",
    icon: "✓",
    className: "bg-emerald-50 text-emerald-600",
  },
  INSTITUTION_CONFIRMATION_REQUIRED: {
    label: "기관 확인 필요",
    icon: "?",
    className: "bg-amber-50 text-amber-600",
  },
  DEMO_ASSUMPTION: {
    label: "데모 가정",
    icon: "△",
    className: "bg-[#00afd5]/10 text-[#00afd5]",
  },
};

interface SourceBadgeProps {
  type: SourceType;
  className?: string;
}

export function SourceBadge({ type, className = "" }: SourceBadgeProps) {
  const config = sourceConfig[type];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${config.className} ${className}`}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
