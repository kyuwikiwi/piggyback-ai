import { getRun, getScenario } from "@/lib/api";
import { Alert, Header, Section, SceneNav, SourceBadge, StatCard, StatusBadge } from "@/components/ui";
import { indexSnapshot, slotsOfService, terminalName, wagonsOfService } from "@/lib/view/snapshot";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  const { scenarioId } = await params;
  const { run: runId } = await searchParams;

  const scenario = await getScenario(scenarioId);
  // Present once a run exists, which is how the landing page arrives here. The
  // verdict counts are the service's, not this page's guess from a null weight.
  const run = runId ? await getRun(runId) : null;

  const idx = indexSnapshot(scenario.input_snapshot);
  const { snapshot } = idx;

  const outcomes = run?.order_outcomes ?? [];
  const reviewRequired = outcomes.filter((o) => o.input_state === "REVIEW_REQUIRED").length;
  const valid = outcomes.filter((o) => o.input_state === "VALID").length;
  const availableSlots = snapshot.slots.filter((s) => s.available).length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header>
        <Header />
        <div className="bg-white px-6 pt-6 pb-4">
          <div className="max-w-[1060px] mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
            <p className="text-sm text-gray-500 mt-1">시나리오 요약과 데이터 출처를 확인합니다</p>
          </div>
        </div>
        <SceneNav scenarioId={scenarioId} runId={runId ?? null} />
      </header>

      <main className="max-w-[1060px] mx-auto px-6 py-8 flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500">시나리오</span>
          <code className="text-sm font-bold text-[#00afd5] font-mono">
            {scenario.scenario_id}
          </code>
          <StatusBadge label={scenario.state} size="sm" />
          <SourceBadge type={snapshot.assumptions[0]?.source_type ?? "DEMO_ASSUMPTION"} />
          <span className="ml-auto text-xs text-gray-400">
            정책 {snapshot.policy.policy_id} · v{scenario.policy_version}
          </span>
        </div>

        <div className="flex flex-wrap gap-4">
          <StatCard value={snapshot.orders.length} label="전체 주문" color="default" />
          <StatCard value={run ? valid : "—"} label="유효 주문" color="green" />
          <StatCard value={run ? reviewRequired : "—"} label="확인 필요" color="amber" />
          <StatCard value={snapshot.services.length} label="운행" color="blue" />
          <StatCard value={availableSlots} label="가용 슬롯" color="purple" />
        </div>

        <Section title="운행 현황" accent="blue">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {snapshot.services.map((svc) => {
              const isBaseline = snapshot.baseline_service_ids.includes(svc.service_id);
              const wagons = wagonsOfService(idx, svc.service_id);
              const slots = slotsOfService(idx, svc.service_id);
              const available = slots.filter((s) => s.available).length;
              return (
                <div key={svc.service_id} className="rounded-xl border border-gray-200 p-5">
                  <div className="flex justify-between items-center mb-3">
                    <code className="text-sm font-bold font-mono text-gray-900">
                      {svc.service_id}
                    </code>
                    <StatusBadge label={isBaseline ? "기준 운행" : "대안 운행"} size="sm" />
                  </div>
                  <div className="text-sm text-gray-500 leading-7">
                    {terminalName(idx, svc.origin_terminal_id)} →{" "}
                    {terminalName(idx, svc.destination_terminal_id)}
                    <br />
                    화차 {wagons.length}량 · 슬롯 {available}/{slots.length}개
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="터미널 현황" accent="green">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {snapshot.terminals.map((t) => (
              <div key={t.terminal_id} className="rounded-xl border border-gray-200 p-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-gray-900">{t.display_name}</span>
                  <code className="text-xs font-mono text-gray-400">{t.terminal_id}</code>
                </div>
                <div className="text-sm text-gray-500 leading-7">
                  운영 {t.operating_window.open}~{t.operating_window.close}
                  <br />
                  처리시간 {t.minimum_handling_minutes}분
                  {t.intake_cutoff_minutes != null && ` · 반입 마감 출발 ${t.intake_cutoff_minutes}분 전`}
                </div>
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {t.supported_tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Alert type="info">
          <strong className="text-gray-900">데모 가정</strong> —{" "}
          {snapshot.assumptions.map((a) => a.description).join(" ")} 실제 운행 가능성,
          비용·탄소 절감을 주장하지 않습니다.
        </Alert>
      </main>

      <footer className="max-w-[1060px] mx-auto px-6 py-4 flex justify-between text-xs text-gray-400">
        <span>데모 가정 데이터 · 실제 운영 승인 기준이 아닙니다</span>
        <span>
          {snapshot.policy.policy_id} · {snapshot.as_of.slice(0, 10)}
        </span>
      </footer>
    </div>
  );
}
