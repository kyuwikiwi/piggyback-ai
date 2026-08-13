import { redirect } from "next/navigation";

import {
  createCanonicalScenario,
  createRun,
  probeBackend,
  validateScenario,
  CANONICAL_SOLVER_PARAMETERS,
} from "@/lib/api";
import { Alert, Header } from "@/components/ui";

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

/**
 * The button is the point of this page.
 *
 * It looks like a click tax -- one scenario, no options, nothing to choose --
 * but it is what keeps `create → validate → solve` off a GET. Each press stores
 * a new scenario and run server-side, so doing it on load would pile up a
 * scenario per refresh and let a prefetch start a solve nobody asked for. The
 * solver also runs up to ten seconds; behind a click that reads as work, on
 * load it reads as a hang.
 *
 * Everything else here is deliberately quiet. The storage backend and the
 * generative fallback matter when something is wrong, not when it is the first
 * thing a visitor sees.
 */
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

      <main className="max-w-[720px] mx-auto px-6 py-20 flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold text-gray-900 leading-tight">철도 슬롯 편성</h1>
          <p className="text-lg text-gray-500 leading-8">
            주문 9건을 운행 3개·슬롯 7개에 편성해, 주문마다{" "}
            <strong className="text-gray-900">편성 가능 · 대기 · 불가 · 확인 필요</strong>를
            판정하고, 불가한 주문은 무엇을 바꾸면 다시 검토할 수 있는지 보여줍니다.
          </p>
        </div>

        {backend.reachable ? (
          <div className="flex flex-col gap-3">
            <form action={startScenario}>
              <button
                type="submit"
                className="h-14 px-8 rounded-full bg-korail-blue text-white text-lg font-semibold transition-colors hover:bg-[#004080]"
              >
                데모 시나리오 시작
              </button>
            </form>
            <p className="text-sm text-gray-400">
              시나리오를 만들고 입력을 검증한 뒤 기본 편성을 실행합니다. 최대{" "}
              {CANONICAL_SOLVER_PARAMETERS.max_time_seconds}초 걸립니다.
            </p>
          </div>
        ) : (
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
