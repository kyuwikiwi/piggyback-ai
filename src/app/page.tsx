import { redirect } from "next/navigation";

import {
  createCanonicalScenario,
  createRun,
  probeBackend,
  validateScenario,
  CANONICAL_SOLVER_PARAMETERS,
} from "@/lib/api";
import { Alert, Header, Section, StatusBadge } from "@/components/ui";

export const metadata = {
  title: "PiggyOn — 철도 슬롯 편성",
  description: "정본 시나리오를 실행해 편성 결과를 확인합니다.",
};

/**
 * Nothing here is cached. The scenario this page creates is stored server-side
 * and its id appears in the redirect, so a cached render would hand the next
 * visitor someone else's run.
 */
export const dynamic = "force-dynamic";

async function startScenario() {
  "use server";

  const scenario = await createCanonicalScenario();
  await validateScenario(scenario.scenario_id);
  const run = await createRun(scenario.scenario_id);

  // Outside any try/catch: redirect signals by throwing.
  redirect(
    `/scenarios/${encodeURIComponent(scenario.scenario_id)}?run=${encodeURIComponent(run.run_id)}`,
  );
}

export default async function LandingPage() {
  const backend = await probeBackend();

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header />

      <main className="max-w-[1060px] mx-auto px-6 py-12 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold text-gray-900">철도 슬롯 편성</h1>
          <p className="text-base text-gray-500 leading-7 max-w-2xl">
            정본 시나리오(주문 9건 · 운행 3개 · 슬롯 7개)를 편성해, 주문마다{" "}
            <strong className="text-gray-900">편성 가능 · 확인 필요 · 불가</strong>를
            판정하고 불가한 주문은 무엇을 바꾸면 다시 검토할 수 있는지 보여줍니다.
          </p>
        </div>

        <Section title="백엔드 상태" accent="blue">
          {backend.reachable ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <StatusBadge label="연결됨" size="sm" />
                <span className="text-gray-500">
                  저장소{" "}
                  <code className="font-mono text-gray-900">
                    {backend.health.storage_backend}
                  </code>
                  {backend.health.storage_reachable ? " · 도달 가능" : " · 도달 불가"}
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500">
                  생성형 레이어{" "}
                  {backend.ai.llm_available ? (
                    <code className="font-mono text-gray-900">LLM</code>
                  ) : (
                    <code className="font-mono text-gray-900">{backend.ai.fallback}</code>
                  )}
                </span>
              </div>
              {!backend.ai.llm_available && (
                <p className="text-xs text-gray-400">
                  모델 키가 없어 규칙 기반 추출과 템플릿 문장으로 동작합니다. 판정과 편성은
                  생성형 레이어와 무관하므로 결과는 동일합니다.
                </p>
              )}
            </div>
          ) : (
            <Alert type="error">
              <strong className="text-gray-900">백엔드에 연결할 수 없습니다.</strong>
              <br />
              <code className="text-xs font-mono break-all">{backend.detail}</code>
              <br />
              <span className="text-sm">
                백엔드 저장소에서 <code className="font-mono">uvicorn app.main:app --port 8000</code>
                을 실행하고, <code className="font-mono">.env.local</code>의{" "}
                <code className="font-mono">API_BASE_URL</code>을 확인하세요.
              </span>
            </Alert>
          )}
        </Section>

        <form action={startScenario}>
          <button
            type="submit"
            disabled={!backend.reachable}
            className="h-12 px-6 rounded-full bg-korail-blue text-white text-base font-semibold transition-colors hover:bg-[#004080] disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            데모 시나리오 시작
          </button>
          <p className="mt-3 text-sm text-gray-400">
            시나리오를 생성하고 입력을 검증한 뒤 기본 편성을 실행합니다. 솔버 설정은
            재현을 위해 고정입니다 — seed {CANONICAL_SOLVER_PARAMETERS.random_seed} · worker{" "}
            {CANONICAL_SOLVER_PARAMETERS.num_search_workers} · 제한{" "}
            {CANONICAL_SOLVER_PARAMETERS.max_time_seconds}초.
          </p>
        </form>

        <Alert type="info">
          <strong className="text-gray-900">데모 가정</strong> — 모든 운영 수치와 좌표는
          DEMO_ASSUMPTION입니다. 실제 운행 가능성, 비용·탄소 절감을 주장하지 않습니다.
        </Alert>
      </main>
    </div>
  );
}
