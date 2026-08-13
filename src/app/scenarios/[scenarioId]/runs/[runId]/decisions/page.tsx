//장면5- 결정 기록


"use client";

import { orderOutcomes, solverRun, decisionRecord, axisRows, axisColors } from "@/lib/fixtures";
import { Header, StatusBadge, StatCard, Section, Alert, SceneNav } from "@/components/ui";

export default function DecisionsPage() {
  const decisions = decisionRecord.order_decisions;
  const accepted = decisions.filter((d) => d.decision === "ACCEPTED").length;
  const held = decisions.filter((d) => d.decision === "HELD").length;
  const rejected = decisions.filter((d) => d.decision === "REJECTED").length;

  const merged = decisions.map((d) => {
    const oc = orderOutcomes.find((o) => o.order_id === d.order_id)!;
    return { ...d, ...oc };
  });

  const decisionLabel = (dec: string) => {
    if (dec === "ACCEPTED") return "채택";
    if (dec === "HELD") return "보류";
    return "반려";
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header>
        <Header />
        <div className="bg-white px-6 pt-6 pb-4">
          <div className="max-w-[1060px] mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">결정 기록</h1>
            <p className="text-sm text-gray-500 mt-1">PASS 실행에 대한 채택·보류·반려와 사유</p>
          </div>
        </div>
        <SceneNav />
      </header>

      <main className="max-w-[1060px] mx-auto px-6 py-8 flex flex-col gap-5">
        <Section title="편성 결과 요약" accent="blue">
          <div className="grid grid-cols-5 gap-3 mb-6">
            <StatCard value={decisions.length} label="전체 주문" color="default" />
            <StatCard value={accepted} label="채택" color="green" />
            <StatCard value={held} label="보류" color="amber" />
            <StatCard value={rejected} label="반려" color="red" />
            <StatCard value={solverRun.run_state === "SOLVED_OPTIMAL" ? "PASS" : "FAIL"} label="검증 상태" color={solverRun.validator_status === "PASS" ? "green" : "red"} />
          </div>

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">운행별 배정</div>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-gray-900">SVC-AM-01</span>
                <StatusBadge label="기준 운행" size="sm" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 mb-1">3건 배정</div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {["ORD-001", "ORD-002", "ORD-003"].map((id) => (
                  <code key={id} className="font-mono text-xs font-semibold px-2 py-1 rounded-md bg-emerald-50 text-emerald-600">{id}</code>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-gray-900">SVC-NEXT-01</span>
                <StatusBadge label="대안 운행" size="sm" />
              </div>
              <div className="text-2xl font-extrabold text-violet-600 mb-1">1건 대안</div>
              <div className="flex gap-1.5">
                <code className="font-mono text-xs font-semibold px-2 py-1 rounded-md bg-violet-50 text-violet-600">ORD-005</code>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-gray-900">SVC-AC-01</span>
                <StatusBadge label="대안 운행" size="sm" />
              </div>
              <div className="text-2xl font-extrabold text-violet-600 mb-1">1건 대안</div>
              <div className="flex gap-1.5">
                <code className="font-mono text-xs font-semibold px-2 py-1 rounded-md bg-violet-50 text-violet-600">ORD-008</code>
              </div>
            </div>
          </div>
        </Section>

        <Section title="주문별 최종 결정" accent="green">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                {["주문", "상태", "운행", "슬롯", "결정", "사유"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {merged.map((m) => (
                <tr key={m.order_id} className="border-b border-gray-100">
                  <td className="px-3 py-3 font-mono font-bold text-sm text-gray-900">{m.order_id}</td>
                  <td className="px-3 py-3"><StatusBadge label={m.display_label} size="sm" /></td>
                  <td className="px-3 py-3 text-gray-500">{m.assigned_service_id ?? "—"}</td>
                  <td className="px-3 py-3 font-mono text-gray-500">{m.assigned_slot_id ?? "—"}</td>
                  <td className="px-3 py-3"><StatusBadge label={decisionLabel(m.decision)} size="sm" /></td>
                  <td className="px-3 py-3 text-gray-500 text-xs">{m.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="5축 상태 요약" accent="blue">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                {["주문", "input", "eligibility", "assignment", "alternative", "decision"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {axisRows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100">
                  <td className="px-3 py-2.5 font-mono font-bold text-sm text-gray-900">{row.id}</td>
                  {[row.input, row.eligibility, row.assignment, row.alternative, row.decision].map((val, i) => (
                    <td key={i} className="px-3 py-2.5">
                      <span className={`font-mono text-xs font-bold ${axisColors[val] ?? "text-gray-400"}`}>{val}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-xs text-gray-400 mt-3">* 기본 운행 기준 INELIGIBLE이지만 승인된 대안에서 배정</div>
        </Section>

        <Section title="추적 정보" accent="muted">
          <div className="grid grid-cols-[140px_1fr] gap-x-5 gap-y-2.5 text-sm">
            {[
              ["시나리오", solverRun.scenario_id],
              ["정책 버전", solverRun.policy_version],
              ["실행 ID", solverRun.run_id],
              ["실행 상태", solverRun.run_state],
              ["독립 검증", solverRun.validator_status],
              ["입력 해시", solverRun.reproducibility.input_hash],
              ["결과 해시", solverRun.reproducibility.result_hash],
              ["솔버 seed", String(solverRun.reproducibility.solver_settings.random_seed)],
              ["workers", String(solverRun.reproducibility.solver_settings.num_search_workers)],
              ["결정자", `${decisionRecord.actor_role} (데모)`],
              ["결정 시각", "2026-08-13 10:30 KST"],
            ].map(([k, v]) => (
              <div key={k} className="contents">
                <span className="text-gray-400 font-semibold text-xs">{k}</span>
                <code className="font-mono text-gray-600 text-xs">{v}</code>
              </div>
            ))}
          </div>
        </Section>

        <Alert type="info">
          <strong className="text-gray-900">핵심</strong> — 최종 결정은 운영자가 내리고 입력·정책·검증 근거를 남깁니다.
        </Alert>
      </main>

      <footer className="max-w-[1060px] mx-auto px-6 py-4 flex justify-between text-xs text-gray-400">
        <span>데모 가정 데이터 · 실제 운영 승인 기준이 아닙니다</span>
        <span>DEMO_POLICY_V1 · 2026-08-13</span>
      </footer>
    </div>
  );
}