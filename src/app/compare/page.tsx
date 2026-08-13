import Link from "next/link";

import { getRun, getScenario, listScenarios } from "@/lib/api";
import type { Run, ScenarioDetail } from "@/lib/api";
import { Alert, Header, Section, StatusBadge, WagonDiagram } from "@/components/ui";
import { describeChange, planDeltas } from "@/lib/view/alternatives";
import { formatRelative } from "@/lib/view/format";
import { indexSnapshot } from "@/lib/view/snapshot";

export const dynamic = "force-dynamic";

/**
 * Two scenarios, side by side.
 *
 * The dashboard already compares a derived plan against the one it came from,
 * which covers the case the alternative engine creates. It does not cover the
 * one an operator ends up with: three or four scenarios off the same baseline
 * -- an order added here, a terminal changed there -- and a question about two
 * of them that are not parent and child.
 *
 * Both sides are the service's own assignments. Nothing is recomputed; rows
 * that did not move are dropped so the table shows the difference.
 */

interface Side {
  scenario: ScenarioDetail;
  run: Run | null;
}

async function load(scenarioId: string | undefined): Promise<Side | null> {
  if (!scenarioId) return null;
  const scenario = await getScenario(scenarioId);
  return {
    scenario,
    run: scenario.latest_run_id ? await getRun(scenario.latest_run_id) : null,
  };
}

function Summary({ side }: { side: Side }) {
  const outcomes = side.run?.order_outcomes ?? [];
  const assigned = outcomes.filter((o) => o.assignment_state === "ASSIGNED").length;
  const ineligible = outcomes.filter((o) => o.eligibility_state === "INELIGIBLE").length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/scenarios/${encodeURIComponent(side.scenario.scenario_id)}`}
          className="font-mono text-sm font-bold text-korail-blue hover:underline"
        >
          {side.scenario.scenario_id}
        </Link>
        <StatusBadge label={side.scenario.state} size="sm" />
        {side.run && <StatusBadge label={side.run.solver_status} size="sm" />}
      </div>

      <div className="text-sm text-gray-500">
        주문 {side.scenario.input_snapshot.orders.length}건 · 배정 {assigned}건 · 부적합{" "}
        {ineligible}건
      </div>

      <div className="text-xs text-gray-400">
        기준 운행{" "}
        <code className="font-mono">
          {side.scenario.input_snapshot.baseline_service_ids.join(", ")}
        </code>
        {side.scenario.parent_scenario_id && (
          <>
            {" · "}
            <code className="font-mono">{side.scenario.parent_scenario_id}</code>에서 파생
            {side.scenario.change_set.length > 0 &&
              ` · ${side.scenario.change_set.map((c) => describeChange(c).text).join(", ")}`}
          </>
        )}
      </div>
    </div>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;

  const [scenarios, left, right] = await Promise.all([listScenarios(50), load(a), load(b)]);

  const deltas = left && right ? planDeltas(left.run, right.run) : [];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-200">
        <Header />
        <div className="max-w-[1180px] mx-auto px-6 py-5">
          <Link href="/" className="text-sm text-korail-blue hover:underline">
            ← 시나리오 목록
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">시나리오 비교</h1>
          <p className="text-sm text-gray-500 mt-1">
            두 편성을 나란히 놓고 배정이 달라진 주문만 봅니다
          </p>
        </div>
      </header>

      <main className="max-w-[1180px] mx-auto px-6 py-8 flex flex-col gap-5">
        <Section title="비교할 시나리오" accent="blue">
          {/* A GET form: comparing reads two stored plans and writes nothing, so
              the pair belongs in the URL where it can be shared. */}
          <form method="get" className="flex flex-wrap items-end gap-4">
            {(
              [
                ["a", "왼쪽", a],
                ["b", "오른쪽", b],
              ] as const
            ).map(([name, label, value]) => (
              <label key={name} className="flex flex-col gap-1.5 text-sm">
                <span className="text-gray-500">{label}</span>
                <select
                  name={name}
                  defaultValue={value ?? ""}
                  className="h-10 min-w-[220px] rounded-lg border border-gray-300 px-3 text-gray-900"
                >
                  <option value="">— 고르세요 —</option>
                  {scenarios.map((scenario) => (
                    <option key={scenario.scenario_id} value={scenario.scenario_id}>
                      {scenario.scenario_id} · 주문 {scenario.order_count}건 ·{" "}
                      {formatRelative(scenario.created_at)}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            <button
              type="submit"
              className="h-10 px-5 rounded-full bg-korail-blue text-white text-sm font-semibold"
            >
              비교
            </button>
          </form>
        </Section>

        {left && right ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[left, right].map((side, i) => {
                const idx = indexSnapshot(side.scenario.input_snapshot);
                return (
                  <Section
                    key={side.scenario.scenario_id + i}
                    title={i === 0 ? "왼쪽" : "오른쪽"}
                    accent={i === 0 ? "muted" : "purple"}
                  >
                    <div className="flex flex-col gap-4">
                      <Summary side={side} />
                      {side.scenario.input_snapshot.baseline_service_ids.map((serviceId) => (
                        <WagonDiagram
                          key={serviceId}
                          idx={idx}
                          serviceId={serviceId}
                          assignments={side.run?.assignments ?? []}
                        />
                      ))}
                    </div>
                  </Section>
                );
              })}
            </div>

            <Section title="배정이 달라진 주문" accent="green">
              {deltas.length === 0 ? (
                <p className="text-sm text-gray-500">
                  두 편성의 배정이 같습니다. 입력이 달라도 결과가 같을 수 있습니다.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 border-b border-gray-200">
                        <th className="py-2 pr-3 font-medium">주문</th>
                        <th className="py-2 pr-3 font-medium">
                          <code className="font-mono">{left.scenario.scenario_id}</code>
                        </th>
                        <th className="py-2 font-medium">
                          <code className="font-mono">{right.scenario.scenario_id}</code>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {deltas.map((delta) => (
                        <tr key={delta.orderId} className="border-b border-gray-100">
                          <td className="py-2.5 pr-3">
                            <code className="font-mono font-medium text-gray-900">
                              {delta.orderId}
                            </code>
                          </td>
                          <td className="py-2.5 pr-3 text-gray-500">
                            {delta.before
                              ? `${delta.before.service_id} · ${delta.before.slot_id}`
                              : "미배정"}
                          </td>
                          <td className="py-2.5 text-gray-500">
                            {delta.after
                              ? `${delta.after.service_id} · ${delta.after.slot_id}`
                              : "미배정"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Alert type="info">
              <strong className="text-gray-900">핵심</strong> — 두 배정 모두 서비스가 계산한
              결과이고, 이 화면은 차이만 골라 보여줍니다. 두 시나리오가 같은 계보에서 나왔는지는
              위 요약의 파생 표시로 확인하세요. 계보가 다르면 입력 자체가 달라서 비교의 의미가
              제한됩니다.
            </Alert>
          </>
        ) : (
          <p className="text-sm text-gray-500 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center">
            위에서 두 시나리오를 고르세요.
          </p>
        )}
      </main>
    </div>
  );
}
