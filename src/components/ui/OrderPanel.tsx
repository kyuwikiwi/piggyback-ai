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
  existingAlternativeHref,
  search,
  blockedLabel,
  editHref,
}: {
  orderId: string;
  label: string | null;
  badges: readonly string[];
  axes: readonly PanelAxis[];
  comparison: ConstraintComparison | null;
  note: string | null;
  sourceType: Assumption["source_type"];
  closeHref: string;
  /** The derived scenario this order already has, if one was found before. */
  existingAlternativeHref: string | null;
  /**
   * Searching stores a derived scenario and a derived run, so it is a form
   * rather than a link. Behind a URL, every refresh created another one.
   */
  search: {
    action: (formData: FormData) => Promise<void>;
    runId: string;
    adjustments: readonly string[];
    label: string;
    /**
     * What the generative layer proposes trying first, and why.
     *
     * A proposal only. The boxes it ticks are the ones the search will be sent,
     * and the search may well come back with nothing -- which is the point:
     * the model is allowed to be wrong here because the solver answers.
     */
    suggestion: { types: readonly string[]; reason: string } | null;
  } | null;
  /** Shown when nothing may be adjusted, so the absence has a reason. */
  blockedLabel: string | null;
  /** Where to correct this order's values, deriving a scenario from the fix. */
  editHref: string;
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

      {existingAlternativeHref ? (
        <Link
          href={existingAlternativeHref}
          className="h-9 rounded-full bg-korail-blue text-white text-sm font-semibold flex items-center justify-center hover:bg-[#004080]"
        >
          대안 시나리오 열기 →
        </Link>
      ) : search ? (
        <form action={search.action} className="flex flex-col gap-2">
          <input type="hidden" name="order_id" value={orderId} />
          <input type="hidden" name="run_id" value={search.runId} />

          {/* One checkbox per approved change rather than sending them all.
              An order approved for both a later service and a different
              terminal was always asked about both at once, so the derived plan
              could not say which one was actually needed -- and the two cost
              very different conversations to arrange. */}
          {search.suggestion && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-2.5 flex flex-col gap-1">
              <span className="text-[10px] text-blue-700">제안</span>
              <p className="text-[11px] text-gray-700 leading-5">{search.suggestion.reason}</p>
              {/* Said plainly, because the box below is already ticked and an
                  operator should know a model ticked it. */}
              <span className="text-[10px] text-gray-400">
                제안일 뿐이며, 실행 가능 여부는 솔버가 판정합니다
              </span>
            </div>
          )}

          <fieldset className="flex flex-col gap-1">
            <legend className="text-[11px] text-gray-400 mb-1">시도할 변경</legend>
            {search.adjustments.map((adjustment) => (
              <label key={adjustment} className="flex items-center gap-2 text-[11px] text-gray-600">
                <input
                  type="checkbox"
                  name="adjustments"
                  value={adjustment}
                  // Exactly the proposed set, which is usually one change: an
                  // order approved for two is otherwise always asked about
                  // both, and the derived plan cannot then say which was
                  // needed. Where two genuinely have to travel together the
                  // proposal says so and both are ticked.
                  defaultChecked={
                    search.suggestion ? search.suggestion.types.includes(adjustment) : true
                  }
                  className="accent-korail-blue"
                />
                <span className="font-mono">{adjustment}</span>
              </label>
            ))}
          </fieldset>

          <button
            type="submit"
            className="w-full h-9 rounded-full bg-korail-blue text-white text-sm font-semibold hover:bg-[#004080]"
          >
            {search.label}
          </button>
        </form>
      ) : (
        blockedLabel && (
          <span className="h-9 rounded-full bg-gray-100 text-gray-400 text-sm font-medium flex items-center justify-center">
            {blockedLabel}
          </span>
        )
      )}

      <Link
        href={editHref}
        className="h-9 rounded-full border border-gray-300 text-gray-700 text-sm font-medium flex items-center justify-center hover:border-korail-blue hover:text-korail-blue"
      >
        값 수정
      </Link>
    </aside>
  );
}
