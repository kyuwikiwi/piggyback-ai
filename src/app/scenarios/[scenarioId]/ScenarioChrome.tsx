import Link from "next/link";

import { deleteScenarioAction } from "./actions";
import type { ScenarioView } from "@/lib/view/scenario";
import { summaryStats } from "@/lib/view/scenario";
import { describeChange } from "@/lib/view/alternatives";
import { Header, SourceBadge, StatBar, StatusBadge } from "@/components/ui";

/**
 * 시나리오 하나의 머리말 — 어느 시나리오이고, 지금 상태가 무엇이고, 어디로 갈 수
 * 있는지.
 *
 * 네 탭이 이걸 공유한다. 요약 줄과 배지가 탭마다 그대로 남아 있어야 "타임라인을
 * 보는 동안 불가가 몇 건이었는지"를 다시 찾으러 돌아가지 않는다 — 화면을 나눈
 * 대가로 맥락까지 나눠 버리면 나눈 의미가 없다.
 */

export type ScenarioTab = "plan" | "timeline" | "ai" | "lineage";

interface TabSpec {
  key: ScenarioTab;
  label: string;
  /** Appended to the scenario base. Empty for the default tab. */
  path: string;
}

const TABS: readonly TabSpec[] = [
  { key: "plan", label: "편성", path: "" },
  { key: "timeline", label: "타임라인", path: "/timeline" },
  { key: "ai", label: "AI", path: "/ai" },
  { key: "lineage", label: "계보", path: "/lineage" },
];

export function ScenarioChrome({
  view,
  tab,
  children,
}: {
  view: ScenarioView;
  tab: ScenarioTab;
  children: React.ReactNode;
}) {
  const { scenario, snapshot, run, runId, parentId, parent, derived, ai } = view;
  const base = `/scenarios/${encodeURIComponent(scenario.scenario_id)}`;

  // A dot on the AI tab when the generative layer actually produced something
  // for this run, so the tab is not a permanently lit advert for a feature that
  // had nothing to say.
  const aiCount = view.rows.filter((r) => r.suggestion).length;

  return (
    <div className="min-h-screen bg-canvas font-sans">
      <header className="bg-white border-b border-line">
        <Header />

        <div className="max-w-[1180px] mx-auto px-6 pt-4 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Link href="/" className="text-[13px] text-ink-3 hover:text-ink">
              시나리오
            </Link>
            <span className="text-line-strong">/</span>
            <code className="text-lg font-semibold font-mono text-ink">
              {scenario.scenario_id}
            </code>
            <StatusBadge label={scenario.state} size="sm" />
            {run && <StatusBadge label={run.solver_status} size="sm" />}
            {run && (
              <span className="flex items-center gap-1.5">
                <span className="text-[13px] text-ink-3">검증</span>
                <StatusBadge label={run.validator_status} size="sm" />
              </span>
            )}

            <span className="ml-auto flex items-center gap-1.5">
              {/* Refused by the service while anything was derived from this
                  scenario, so the button is hidden rather than offered and
                  rejected. */}
              {derived.length === 0 && (
                <form action={deleteScenarioAction}>
                  <input type="hidden" name="scenario_id" value={scenario.scenario_id} />
                  <button type="submit" className="btn btn-quiet btn-danger">
                    삭제
                  </button>
                </form>
              )}
              <Link href={`${base}/orders/new`} className="btn">
                주문 추가
              </Link>
              {runId && (
                <Link
                  href={`${base}/runs/${encodeURIComponent(runId)}/decisions`}
                  className="btn btn-primary"
                >
                  결정 기록
                </Link>
              )}
            </span>
          </div>

          {/* 정책과 출처는 이 실행의 성격이지 지금 할 일이 아니다. 시나리오
              번호와 같은 줄에 두면 배지 여섯 개가 나란히 서서 어느 것이
              확인해야 할 값인지 사라진다. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
            <span>
              정책 <code className="font-mono">{snapshot.policy.policy_id}</code> · v
              {scenario.policy_version}
            </span>
            <span className="text-line-strong">·</span>
            <span className="flex items-center gap-1">
              입력 출처
              <SourceBadge type={snapshot.assumptions[0]?.source_type ?? "DEMO_ASSUMPTION"} />
            </span>
            {parentId && (
              <>
                <span className="text-line-strong">·</span>
                <Link
                  href={`/scenarios/${encodeURIComponent(parentId)}`}
                  className="text-korail-blue hover:underline font-mono"
                >
                  {parentId}
                </Link>
                <span>에서 파생</span>
                {scenario.change_set.length > 0 ? (
                  scenario.change_set.map((change, i) => (
                    <span key={i} className="text-ink">
                      {describeChange(change).text}
                    </span>
                  ))
                ) : parent && parent.order_count !== snapshot.orders.length ? (
                  // An approved adjustment names itself; a snapshot assembled
                  // by the order form does not, so say what actually differs.
                  <span className="text-ink">
                    주문 {snapshot.orders.length - parent.order_count > 0 ? "+" : ""}
                    {snapshot.orders.length - parent.order_count}
                  </span>
                ) : null}
              </>
            )}
          </div>

          <nav className="flex items-end gap-1 -mb-px pt-1" aria-label="시나리오 화면">
            {TABS.map((spec) => {
              const active = spec.key === tab;
              return (
                <Link
                  key={spec.key}
                  href={`${base}${spec.path}`}
                  aria-current={active ? "page" : undefined}
                  className={`px-3.5 py-2.5 text-sm border-b-2 transition-colors ${
                    active
                      ? "border-korail-blue text-ink font-semibold"
                      : "border-transparent text-ink-3 hover:text-ink"
                  }`}
                >
                  {spec.label}
                  {spec.key === "ai" && aiCount > 0 && (
                    <span
                      className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-korail-blue align-middle"
                      aria-label={`제안 ${aiCount}건`}
                    />
                  )}
                  {spec.key === "lineage" && derived.length > 0 && (
                    <span className="ml-1.5 text-[13px] text-ink-3 tabular-nums">
                      {derived.length}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-[1180px] mx-auto px-6 py-6 flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <StatBar stats={summaryStats(view)} />
          <p className="text-[13px] text-ink-3 pb-0.5">
            주문 {view.rows.length}건 · 기준 운행{" "}
            <code className="font-mono">{snapshot.baseline_service_ids.join(", ")}</code> · 가용
            슬롯 {view.capacity}개
            {!ai.llm_available && (
              <>
                {" · "}생성형 <code className="font-mono">{ai.fallback}</code>
              </>
            )}
          </p>
        </div>

        {children}

        <p className="pt-2 border-t border-line text-[13px] text-ink-3">
          모든 수치는 데모 가정값입니다.
        </p>
      </main>
    </div>
  );
}
