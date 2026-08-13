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
  ok: "text-ok",
  bad: "text-bad",
  muted: "text-ink-3",
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
    /** The action re-reads the scenario rather than taking a snapshot by post. */
    scenarioId: string;
    runId: string;
    /** Where a miss should land back. */
    from: "plan" | "ai";
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
    // 판이 구역 높이만큼 늘어나 아래쪽이 비어 있었다. 내용만큼만 차지하고, 넓은
    // 화면에서는 목록을 스크롤하는 동안 따라온다.
    <aside className="self-start lg:sticky lg:top-4 rounded-[10px] border border-line bg-white shadow-panel p-4 flex flex-col gap-3.5">
      <div className="flex items-center gap-2">
        <code className="font-mono text-[15px] font-semibold text-ink">{orderId}</code>
        <Link
          href={closeHref}
          aria-label="상세 닫기"
          className="ml-auto text-ink-3 hover:text-ink text-[13px]"
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

      <dl className="flex flex-col gap-1 text-[13px]">
        {axes.map((axis) => (
          <div key={axis.label} className="flex justify-between gap-3">
            <dt className="text-ink-3">{axis.label}</dt>
            <dd className={`font-mono ${axisTone[axis.tone]}`}>{axis.value}</dd>
          </div>
        ))}
      </dl>

      {comparison && (
        <div className="rounded-md bg-sunken border border-line px-2.5 py-2 flex flex-col gap-1">
          <code className="text-[11px] text-ink-3">{comparison.code}</code>
          <ConstraintCompare comparison={comparison} />
        </div>
      )}

      {note && <p className="text-[13px] text-ink-2 leading-5">{note}</p>}

      <div className="flex items-center gap-1.5 text-[13px] text-ink-3">
        <span>입력 출처</span>
        <SourceBadge type={sourceType} />
      </div>

      {existingAlternativeHref ? (
        <Link href={existingAlternativeHref} className="btn btn-primary w-full">
          대안 시나리오 열기
        </Link>
      ) : search ? (
        <form action={search.action} className="flex flex-col gap-2">
          <input type="hidden" name="scenario_id" value={search.scenarioId} />
          <input type="hidden" name="order_id" value={orderId} />
          <input type="hidden" name="run_id" value={search.runId} />
          <input type="hidden" name="from" value={search.from} />

          {/* One checkbox per approved change rather than sending them all.
              An order approved for both a later service and a different
              terminal was always asked about both at once, so the derived plan
              could not say which one was actually needed -- and the two cost
              very different conversations to arrange. */}
          {search.suggestion && (
            <div className="border-l-2 border-korail-blue/40 pl-2.5 flex flex-col gap-1">
              <span className="text-[11px] text-korail-blue">제안</span>
              <p className="text-[13px] text-ink-2 leading-5">{search.suggestion.reason}</p>
            </div>
          )}

          <fieldset className="flex flex-col gap-1">
            <legend className="text-[13px] text-ink-3 mb-1">시도할 변경</legend>
            {search.adjustments.map((adjustment) => (
              <label key={adjustment} className="flex items-center gap-2 text-[13px] text-ink-2">
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

          <button type="submit" className="btn btn-primary w-full">
            {search.label}
          </button>
        </form>
      ) : (
        blockedLabel && <span className="btn btn-disabled w-full">{blockedLabel}</span>
      )}

      <Link href={editHref} className="btn w-full">
        값 수정
      </Link>
    </aside>
  );
}
