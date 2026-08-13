import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createCanonicalScenario,
  createRun,
  listScenarios,
  probeBackend,
  validateScenario,
  CANONICAL_SOLVER_PARAMETERS,
} from "@/lib/api";
import type { ScenarioSummary } from "@/lib/api";
import { Alert, Header, StatusBadge } from "@/components/ui";
import { describeChange } from "@/lib/view/alternatives";
import { formatRelative } from "@/lib/view/format";

export const metadata = {
  title: "PiggyOn — 철도 슬롯 편성",
  description: "저장된 시나리오를 열거나 정본 시나리오를 새로 실행합니다.",
};

/**
 * Nothing here is cached. The list changes whenever anyone creates a scenario,
 * and the scenario the button creates is stored server-side.
 */
export const dynamic = "force-dynamic";

/**
 * The scenarios this store holds, and a way to start another.
 *
 * This used to be a single button, because a scenario was reachable only by an
 * id the caller kept from the response that created it -- close the tab and the
 * work was gone, so starting over was the only thing the page could offer. The
 * records were there the whole time.
 *
 * The button stays, and stays a button: it stores a scenario and runs the
 * solver, so putting it behind a page load would pile up a scenario per refresh
 * and let a prefetch start a solve nobody asked for.
 */
async function startScenario() {
  "use server";

  const scenario = await createCanonicalScenario();
  await validateScenario(scenario.scenario_id);
  await createRun(scenario.scenario_id);

  // Outside any try/catch: redirect signals by throwing. No run id in the URL --
  // the scenario knows its own latest run.
  redirect(`/scenarios/${encodeURIComponent(scenario.scenario_id)}`);
}

/** "주문 +1" when the parent is on the same page and the counts differ. */
function describeOrderDelta(
  scenario: ScenarioSummary,
  parent: ScenarioSummary | undefined,
): string {
  if (!parent) return "";
  const difference = scenario.order_count - parent.order_count;
  if (difference === 0) return "";
  return ` · 주문 ${difference > 0 ? "+" : ""}${difference}`;
}

export default async function LandingPage() {
  const backend = await probeBackend();
  const scenarios = backend.reachable ? await listScenarios(20) : [];
  const byId = new Map(scenarios.map((s) => [s.scenario_id, s]));

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header />

      <main className="max-w-[860px] mx-auto px-6 py-16 flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold text-gray-900 leading-tight">철도 슬롯 편성</h1>
          <p className="text-lg text-gray-500 leading-8">
            주문을 운행·화차·슬롯에 편성해, 주문마다{" "}
            <strong className="text-gray-900">편성 가능 · 대기 · 불가 · 확인 필요</strong>를
            판정하고, 불가한 주문은 무엇을 바꾸면 다시 검토할 수 있는지 보여줍니다.
          </p>
        </div>

        {!backend.reachable ? (
          <Alert type="error">
            <strong className="text-gray-900">백엔드에 연결할 수 없습니다.</strong>
            <br />
            <code className="text-xs font-mono break-all">{backend.detail}</code>
            <br />
            <span className="text-sm">
              백엔드 저장소에서{" "}
              <code className="font-mono">uvicorn app.main:app --port 8000</code>을 실행하고,{" "}
              <code className="font-mono">.env.local</code>의{" "}
              <code className="font-mono">API_BASE_URL</code>을 확인하세요. 백엔드 없이 그럴듯한
              결과를 그리지는 않습니다.
            </span>
          </Alert>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <form action={startScenario}>
                <button
                  type="submit"
                  className="h-12 px-6 rounded-full bg-korail-blue text-white text-base font-semibold transition-colors hover:bg-[#004080]"
                >
                  정본 시나리오로 새로 시작
                </button>
              </form>
              <p className="text-sm text-gray-400">
                주문 9건·운행 3개·슬롯 7개를 만들고, 입력을 검증한 뒤 기본 편성을 실행합니다.
                최대 {CANONICAL_SOLVER_PARAMETERS.max_time_seconds}초 걸립니다.
              </p>
            </div>

            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-bold text-gray-900">저장된 시나리오</h2>
                <span className="text-xs text-gray-400">{scenarios.length}건 · 최신순</span>
              </div>

              {scenarios.length === 0 ? (
                <p className="text-sm text-gray-500 rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center">
                  아직 없습니다. 위 버튼으로 첫 시나리오를 만드세요.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {scenarios.map((scenario) => (
                    <li key={scenario.scenario_id}>
                      <Link
                        href={`/scenarios/${encodeURIComponent(scenario.scenario_id)}`}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 transition-colors hover:border-korail-blue"
                      >
                        <code className="font-mono text-sm font-bold text-gray-900">
                          {scenario.scenario_id}
                        </code>
                        <StatusBadge label={scenario.state} size="sm" />
                        <span className="text-sm text-gray-500">주문 {scenario.order_count}건</span>

                        {scenario.parent_scenario_id && (
                          <span className="text-xs text-gray-500">
                            <code className="font-mono">{scenario.parent_scenario_id}</code>에서
                            파생
                            {/* An approved adjustment names itself. A snapshot
                                assembled here does not, so the order count says
                                what changed instead of leaving the row bare. */}
                            {scenario.change_set.length > 0
                              ? ` · ${scenario.change_set.map((c) => describeChange(c).text).join(", ")}`
                              : describeOrderDelta(scenario, byId.get(scenario.parent_scenario_id))}
                          </span>
                        )}

                        {/* A scenario can exist without a run: created, then
                            never solved. The row says so instead of pretending
                            it has a plan to show. */}
                        {!scenario.latest_run_id && (
                          <span className="text-xs text-amber-600">편성 전</span>
                        )}

                        <span className="ml-auto text-xs text-gray-400">
                          {formatRelative(scenario.created_at)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        <footer className="pt-6 border-t border-gray-200 flex flex-col gap-2 text-xs text-gray-400">
          <p>
            모든 운영 수치는 <code className="font-mono">DEMO_ASSUMPTION</code>입니다. 실제 운행
            가능성이나 비용·탄소 절감을 주장하지 않습니다.
          </p>
          {backend.reachable && (
            <p>
              백엔드 연결됨 · 저장소{" "}
              <code className="font-mono">{backend.health.storage_backend}</code> · 생성형 레이어{" "}
              <code className="font-mono">
                {backend.ai.llm_available ? "LLM" : backend.ai.fallback}
              </code>
              {!backend.ai.llm_available && " (판정과 편성은 이 레이어와 무관합니다)"} · 솔버 seed{" "}
              {CANONICAL_SOLVER_PARAMETERS.random_seed} · worker{" "}
              {CANONICAL_SOLVER_PARAMETERS.num_search_workers}
            </p>
          )}
        </footer>
      </main>
    </div>
  );
}
