import type { ConstraintComparison } from "@/lib/view/constraints";

/**
 * ConstraintCompare — 서비스가 비교한 두 값을 나란히
 *
 * `반입 마감 초과`는 규칙의 이름이고, 이 줄은 그 규칙이 어떤 값끼리를 견줬는지
 * 보여준다. 30분 늦은 주문과 6시간 늦은 주문은 같은 사유 코드를 받지만 운영자가
 * 할 일은 다르다.
 *
 * 값은 전부 `constraintComparison`이 스냅샷에서 꺼내 온 것이다. 이 컴포넌트는
 * 판정에 관여하지 않으며, 초과분이 없으면(= 화면과 서비스가 다르게 읽었으면)
 * 배지 없이 두 값만 그린다.
 */
export function ConstraintCompare({
  comparison,
  className = "",
}: {
  comparison: ConstraintComparison;
  className?: string;
}) {
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-1 ${className}`}>
      {comparison.actual.map((term, i) => (
        <span key={term.label} className="font-mono text-[13px] text-ink">
          {i > 0 && <span className="text-ink-3 mr-2">+</span>}
          <span className="text-ink-3">{term.label}</span> {term.value}
        </span>
      ))}

      <span aria-hidden="true" className="text-ink-3">
        →
      </span>

      <span className="font-mono text-[13px] text-ink">
        <span className="text-ink-3">{comparison.limit.label}</span> {comparison.limit.value}
      </span>

      {comparison.excess && (
        <span className="text-[13px] font-medium text-bad whitespace-nowrap">
          {comparison.excess}
        </span>
      )}
    </span>
  );
}
