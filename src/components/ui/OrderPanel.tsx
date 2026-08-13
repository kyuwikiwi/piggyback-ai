import Link from "next/link";

import type { Assumption } from "@/lib/api";
import type { ConstraintComparison } from "@/lib/view/constraints";
import { ConstraintCompare } from "./ConstraintCompare";
import { SourceBadge } from "./SourceBadge";
import { StatusBadge } from "./StatusBadge";

/**
 * OrderPanel — 주문 하나를 고른 뒤 옆에서 열리는 상세
 *
 * 예전에는 주문을 편성 화면에서 보다가, 대안 화면으로 넘어가서, 같은 주문을 다시
 * 골라야 했다. 방금 보던 걸 다시 찾는 셈이다. 이 패널은 보던 자리에서 열리고
 * 대안 실행도 여기서 시작한다.
 *
 * 상태축을 원문 그대로 보여주는 건 의도다. 이 데모가 주장하는 것 중 하나가
 * "다섯 축을 각각 보존한다"이고, 화면이 그걸 합쳐서 문장 하나로 만들면 확인할
 * 방법이 없어진다.
 */

const axisTone = {
  ok: "text-emerald-600",
  bad: "text-red-600",
  muted: "text-gray-400",
} as const;

export interface PanelAxis {
  label: string;
  value: string;
  tone: keyof typeof axisTone;
}

export function OrderPanel({
  orderId,
  label,
  badges,
  axes,
  comparison,
  note,
  sourceType,
  closeHref,
  action,
}: {
  orderId: string;
  label: string | null;
  badges: readonly string[];
  axes: readonly PanelAxis[];
  comparison: ConstraintComparison | null;
  note: string | null;
  sourceType: Assumption["source_type"];
  closeHref: string;
  action: { label: string; href?: string } | null;
}) {
  return (
    <aside className="rounded-xl border border-gray-300 bg-white p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <code className="font-mono text-base font-bold text-gray-900">{orderId}</code>
        <Link
          href={closeHref}
          aria-label="상세 닫기"
          className="ml-auto text-gray-400 hover:text-gray-600 text-sm"
        >
          ✕
        </Link>
      </div>

      {(label || badges.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {label && <StatusBadge label={label} size="sm" />}
          {badges.map((badge) => (
            <StatusBadge key={badge} label={badge} size="sm" />
          ))}
        </div>
      )}

      <dl className="flex flex-col gap-1 text-xs">
        {axes.map((axis) => (
          <div key={axis.label} className="flex justify-between gap-3">
            <dt className="text-gray-500">{axis.label}</dt>
            <dd className={`font-mono ${axisTone[axis.tone]}`}>{axis.value}</dd>
          </div>
        ))}
      </dl>

      {comparison && (
        <div className="rounded-lg bg-gray-50 p-3 flex flex-col gap-1.5">
          <code className="text-[11px] text-gray-400">{comparison.code}</code>
          <ConstraintCompare comparison={comparison} />
        </div>
      )}

      {note && <p className="text-xs text-gray-500 leading-5">{note}</p>}

      <div className="flex items-center gap-2 text-[11px] text-gray-400">
        <span>입력 출처</span>
        <SourceBadge type={sourceType} />
      </div>

      {action &&
        (action.href ? (
          <Link
            href={action.href}
            className="h-9 rounded-full bg-korail-blue text-white text-sm font-semibold flex items-center justify-center hover:bg-[#004080]"
          >
            {action.label}
          </Link>
        ) : (
          <span className="h-9 rounded-full bg-gray-100 text-gray-400 text-sm font-medium flex items-center justify-center">
            {action.label}
          </span>
        ))}
    </aside>
  );
}
