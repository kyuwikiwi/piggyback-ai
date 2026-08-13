import type { Assumption } from "@/lib/api";

/** The vocabulary the contract allows on an assumption. */
type SourceType = Assumption["source_type"];

/**
 * 값이 어디서 왔는지.
 *
 * 앞에 붙던 ✓ ? △는 뗐다 — 라벨이 이미 한국어로 같은 말을 하고 있었고, 세 기호가
 * StatusBadge·CheckItem의 기호와 뜻이 겹쳐서 화면에 부호 체계가 셋이 됐다.
 */
const sourceConfig: Record<SourceType, { label: string; className: string }> = {
  PUBLIC_CONFIRMED: { label: "공개 확인", className: "text-ok" },
  INSTITUTION_CONFIRMATION_REQUIRED: { label: "기관 확인 필요", className: "text-warn" },
  DEMO_ASSUMPTION: { label: "데모 가정", className: "text-ink-3" },
};

interface SourceBadgeProps {
  type: SourceType;
  className?: string;
}

export function SourceBadge({ type, className = "" }: SourceBadgeProps) {
  const config = sourceConfig[type];

  return (
    <span className={`text-[13px] ${config.className} ${className}`}>{config.label}</span>
  );
}
