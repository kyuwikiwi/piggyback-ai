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
 * The button stores a scenario and runs the solver, so putting it behind a page
 * load would pile up a scenario per refresh and let a prefetch start a solve
 * nobody asked for. It stays a button.
 *
 * 목록은 표다. 예전에는 한 줄에 id·상태·건수·계보·시각을 이어 붙인 문장이었는데,
 * 시나리오는 서로 비교하려고 보는 것이라 같은 값이 같은 x좌표에 있어야 한다 --
 * 줄마다 계보 문구 길이가 달라 시각이 들쭉날쭉하면 "언제 만든 것"을 읽는 데
 * 눈이 줄마다 다시 출발한다.
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

export default async function LandingPage() {
  const backend = await probeBackend();
  const scenarios = backend.reachable ? await listScenarios(20) : [];

  return (
    <div className="min-h-screen bg-canvas font-sans">
      <Header />

      <main className="max-w-[1180px] mx-auto px-6 py-10 flex flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-[58ch]">
            <h1 className="text-2xl font-semibold text-ink">철도 슬롯 편성</h1>
            <p className="text-sm text-ink-2 leading-6">
              주문을 운행·화차·슬롯에 편성해 주문마다{" "}
              <strong className="font-medium text-ink">편성 가능 · 대기 · 불가 · 확인 필요</strong>
              를 판정하고, 불가한 주문은 무엇을 바꾸면 다시 검토할 수 있는지 보여줍니다.
            </p>
          </div>

          {backend.reachable && (
            <div className="flex flex-col gap-1.5 items-start">
              <form action={startScenario}>
                <button type="submit" className="btn btn-primary">
                  정본 시나리오로 새로 시작
                </button>
              </form>
              <p className="text-[13px] text-ink-3">
                주문 9건·운행 3개·슬롯 7개 · 최대{" "}
                {CANONICAL_SOLVER_PARAMETERS.max_time_seconds}초
              </p>
            </div>
          )}
        </div>

        {!backend.reachable ? (
          <Alert type="error">
            <strong className="text-ink">백엔드에 연결할 수 없습니다.</strong>
            <br />
            <code className="text-[13px] font-mono break-all">{backend.detail}</code>
            <br />
            <span>
              백엔드 저장소에서{" "}
              <code className="font-mono">uvicorn app.main:app --port 8000</code>을 실행하고,{" "}
              <code className="font-mono">.env.local</code>의{" "}
              <code className="font-mono">API_BASE_URL</code>을 확인하세요. 백엔드 없이 그럴듯한
              결과를 그리지는 않습니다.
            </span>
          </Alert>
        ) : (
          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink">저장된 시나리오</h2>
              <span className="flex items-baseline gap-3 text-[13px] text-ink-3">
                {scenarios.length > 1 && (
                  <Link href="/compare" className="text-korail-blue hover:underline">
                    두 개 비교
                  </Link>
                )}
                <span className="tabular-nums">{scenarios.length}건 · 최신순</span>
              </span>
            </div>

            {scenarios.length === 0 ? (
              <p className="text-sm text-ink-3 border border-dashed border-line-strong rounded-lg px-4 py-8 text-center">
                아직 없습니다. 위 버튼으로 첫 시나리오를 만드세요.
              </p>
            ) : (
              <div className="panel overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[13px] text-ink-3 border-b border-line">
                      <th className="font-medium py-3 pl-5 pr-3 sm:w-[140px] whitespace-nowrap">시나리오</th>
                      <th className="font-medium py-3 pr-3 sm:w-[150px] whitespace-nowrap">상태</th>
                      <th className="hidden sm:table-cell font-medium py-3 pr-6 text-right w-[72px]">주문</th>
                      <th className="font-medium py-3 pr-3 sm:w-[96px] whitespace-nowrap">결정</th>
                      <th className="hidden md:table-cell font-medium py-3 pr-3">유래</th>
                      <th className="font-medium py-3 pr-5 text-right sm:w-[104px] whitespace-nowrap">만든 때</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarios.map((scenario) => {
                      const href = `/scenarios/${encodeURIComponent(scenario.scenario_id)}`;
                      return (
                        <tr
                          key={scenario.scenario_id}
                          className="border-b border-line last:border-0 hover:bg-sunken"
                        >
                          <td className="py-3 pl-5 pr-3">
                            {/* 줄 전체가 아니라 id가 링크다. 표에서는 줄을 통째로
                                링크로 만들면 값을 드래그해 복사할 수가 없다. */}
                            <Link
                              href={href}
                              className="font-mono font-semibold text-korail-blue hover:underline whitespace-nowrap"
                            >
                              {scenario.scenario_id}
                            </Link>
                          </td>

                          <td className="py-3 pr-3">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <StatusBadge label={scenario.state} size="sm" />
                              {/* A scenario can exist without a run: created,
                                  then never solved. The row says so instead of
                                  pretending it has a plan to show. */}
                              {!scenario.latest_run_id && (
                                <span className="text-[13px] text-warn">편성 전</span>
                              )}
                            </span>
                          </td>

                          <td className="hidden sm:table-cell py-3 pr-6 text-right tabular-nums text-ink">
                            {scenario.order_count}
                          </td>

                          <td className="py-3 pr-3">
                            {/* Which of these are settled is the first thing you
                                want on coming back, and it was the one thing the
                                row could not say. */}
                            {scenario.decision_state ? (
                              <StatusBadge label={scenario.decision_state} size="sm" />
                            ) : (
                              <span className="text-ink-3">—</span>
                            )}
                          </td>

                          <td className="hidden md:table-cell py-3 pr-3 text-[13px] text-ink-2">
                            {scenario.parent_scenario_id ? (
                              <span className="flex flex-wrap items-baseline gap-1">
                                <Link
                                  href={`/scenarios/${encodeURIComponent(scenario.parent_scenario_id)}`}
                                  className="font-mono text-korail-blue hover:underline"
                                >
                                  {scenario.parent_scenario_id}
                                </Link>
                                {/* An approved adjustment names itself. A snapshot
                                    assembled by one of the derive screens says what
                                    it did in its name -- correcting a value changes
                                    neither the order count nor the baseline, so
                                    nothing else on the row could tell them apart. */}
                                <span className="text-ink-3">
                                  {scenario.change_set.length > 0
                                    ? scenario.change_set
                                        .map((c) => describeChange(c).text)
                                        .join(", ")
                                    : scenario.scenario_name}
                                </span>
                              </span>
                            ) : (
                              <span className="text-ink-3">기본안</span>
                            )}
                          </td>

                          <td className="py-3 pr-5 text-right text-[13px] text-ink-3 whitespace-nowrap">
                            {formatRelative(scenario.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <footer className="pt-4 border-t border-line flex flex-col gap-2 text-[13px] text-ink-3">
          <p className="leading-5">
            모든 수치는 데모 가정값입니다. 실제 운행 가능성을 주장하지 않습니다.
          </p>
          {backend.reachable && (
            // 한 줄에 이어 붙인 각주였다. 값이 다섯 개고 서로 다른 것을 말하므로
            // 이름을 붙여 나눠 둔다 -- 특히 생성형 레이어가 무엇으로 돌고 있는지는
            // 데모에서 제일 자주 받는 질문이다.
            <dl className="flex flex-wrap gap-x-6 gap-y-1">
              {[
                ["백엔드", "연결됨"],
                ["저장소", backend.health.storage_backend],
                ["생성형 레이어", backend.ai.llm_available ? "LLM" : backend.ai.fallback],
                [
                  "솔버",
                  `seed ${CANONICAL_SOLVER_PARAMETERS.random_seed} · worker ${CANONICAL_SOLVER_PARAMETERS.num_search_workers}`,
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline gap-1.5">
                  <dt>{label}</dt>
                  <dd className="font-mono text-ink-2">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </footer>
      </main>
    </div>
  );
}
