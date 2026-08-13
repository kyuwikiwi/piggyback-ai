import Link from "next/link";

import { createAlternative, getRun, getScenario } from "@/lib/api";
import { Alert, CheckItem, Header, SceneNav, Section, StatusBadge } from "@/components/ui";
import { formatTime } from "@/lib/view/format";
import { reasonLabel } from "@/lib/view/reasons";
import { buildAlternativeView, describeChange } from "@/lib/view/alternatives";
import { indexSnapshot, permittedAdjustments } from "@/lib/view/snapshot";

export const dynamic = "force-dynamic";

export default async function AlternativesPage({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string; runId: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { scenarioId, runId } = await params;
  const { order: selectedOrderId } = await searchParams;

  const run = await getRun(runId);
  const scenario = await getScenario(run.scenario_id);
  const idx = indexSnapshot(scenario.input_snapshot);

  // Candidates are the orders the baseline could not place that carry an
  // approval window. Without a window there is nothing permitted to try, and
  // asking anyway would be a 409.
  const candidates = run.order_outcomes
    .filter((o) => o.assignment_state !== "ASSIGNED")
    .map((o) => ({ outcome: o, adjustments: permittedAdjustments(idx.orderById.get(o.order_id)) }))
    .filter((c) => c.adjustments.length > 0);

  const blocked = run.order_outcomes.filter(
    (o) =>
      o.assignment_state !== "ASSIGNED" &&
      o.input_state === "VALID" &&
      permittedAdjustments(idx.orderById.get(o.order_id)).length === 0,
  );

  const selected = candidates.find((c) => c.outcome.order_id === selectedOrderId);

  // The search runs only when an order is explicitly selected -- landing on the
  // page does nothing. Each search derives a new scenario and run server-side
  // (that is what P3 does), so revisiting this URL derives another; the ids
  // shown below are the ones this view produced.
  const outcome = selected
    ? await createAlternative(runId, selected.outcome.order_id, selected.adjustments)
    : null;

  const view =
    outcome?.found === true
      ? buildAlternativeView(
          outcome,
          (await getScenario(outcome.alternative_scenario_id)).input_snapshot,
        )
      : null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header>
        <Header />
        <div className="bg-white px-6 pt-6 pb-4">
          <div className="max-w-[1060px] mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">대안 비교</h1>
            <p className="text-sm text-gray-500 mt-1">
              승인된 변경만 적용해 파생 시나리오를 계산합니다. 원안은 덮어쓰지 않습니다
            </p>
          </div>
        </div>
        <SceneNav scenarioId={scenarioId} runId={runId} />
      </header>

      <main className="max-w-[1060px] mx-auto px-6 py-8 flex flex-col gap-5">
        <Section title="대안을 검토할 주문" accent="blue">
          {candidates.length === 0 ? (
            <p className="text-sm text-gray-500">
              승인 범위가 열려 있는 미배정 주문이 없습니다.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {candidates.map(({ outcome: o, adjustments }) => {
                const isSelected = o.order_id === selectedOrderId;
                return (
                  <Link
                    key={o.order_id}
                    href={`?order=${encodeURIComponent(o.order_id)}`}
                    className={`rounded-xl border p-4 transition-colors ${
                      isSelected
                        ? "border-korail-blue bg-blue-50"
                        : "border-gray-200 hover:border-korail-light"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <code className="font-mono font-bold text-gray-900">{o.order_id}</code>
                      {o.display_label && <StatusBadge label={o.display_label} size="sm" />}
                    </div>
                    <div className="text-sm text-gray-500">
                      기본안 탈락 사유 {reasonLabel(o.primary_reason_code) ?? "—"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {adjustments.map((a) => (
                        <span
                          key={a}
                          className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-mono"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Section>

        {blocked.length > 0 && (
          <Section title="승인 범위가 없는 주문" accent="red">
            <div className="flex flex-col gap-2">
              {blocked.map((o) => (
                <div key={o.order_id} className="flex flex-wrap items-center gap-2 text-sm">
                  <code className="font-mono font-medium text-gray-900">{o.order_id}</code>
                  {o.display_label && <StatusBadge label={o.display_label} size="sm" />}
                  <span className="text-gray-500">
                    {reasonLabel(o.primary_reason_code) ?? "—"} · 완화하려면 금지된 변경이
                    필요합니다
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {outcome?.found === false && (
          <Section title={`${outcome.order_id} 대안 검토 결과`} accent="amber">
            <Alert type="warning">
              <strong className="text-gray-900">허용 범위 안에 실행 가능한 대안이 없습니다.</strong>
              <br />
              사유 <code className="font-mono text-xs">{outcome.reason_code}</code> —{" "}
              {reasonLabel(outcome.reason_code)}
              {outcome.change_set.length > 0 && (
                <>
                  <br />
                  시도한 변경:{" "}
                  {outcome.change_set.map((c) => describeChange(c).text).join(", ")}
                </>
              )}
            </Alert>
          </Section>
        )}

        {outcome?.found === true && view && (
          <>
            <Section
              title={`${view.orderId} 기본안 → 대안`}
              accent="green"
              headerRight={
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-gray-400">
                    {outcome.alternative_run_id}
                  </code>
                  <StatusBadge label={`검증 ${view.validatorStatus}`} size="sm" />
                </div>
              }
            >
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-xs text-gray-400 mb-1.5">적용된 변경</div>
                  <div className="flex flex-col gap-1.5">
                    {outcome.change_set.map((change, i) => {
                      const described = describeChange(change);
                      return (
                        <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-gray-900">{described.text}</span>
                          <code className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                            {described.code}
                          </code>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {view.serviceId && (
                  <div className="text-sm text-gray-500">
                    <code className="font-mono font-bold text-gray-900">{view.serviceId}</code>
                    {view.slotId && (
                      <>
                        {" · 슬롯 "}
                        <code className="font-mono">{view.slotId}</code>
                      </>
                    )}
                    <br />
                    출발 {formatTime(view.departureAt)} · 도착 {formatTime(view.arrivalAt)} · 반입
                    마감 {formatTime(view.cutoffAt)}
                    {view.destinationName && ` · 도착지 ${view.destinationName}`}
                  </div>
                )}
              </div>
            </Section>

            <Section title="대안 적합성 상세 검증" accent="cyan">
              <div className="flex flex-col gap-2">
                {view.checks.map((check) => (
                  <CheckItem
                    key={check.label}
                    icon={check.icon}
                    label={check.label}
                    detail={check.detail}
                    status={check.status}
                  />
                ))}
              </div>
              <p className="mt-4 text-xs text-gray-400">
                각 항목은 대안 시나리오{" "}
                <code className="font-mono">{outcome.alternative_scenario_id}</code>의 스냅샷에서
                다시 계산한 값입니다.
              </p>
            </Section>

            <Section title="기본안 대비 배정 변화" accent="purple">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-200">
                      <th className="py-2 pr-3 font-medium">주문</th>
                      <th className="py-2 pr-3 font-medium">기본안</th>
                      <th className="py-2 font-medium">대안</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outcome.assignment_deltas.map((delta) => (
                      <tr key={delta.order_id} className="border-b border-gray-100">
                        <td className="py-2.5 pr-3">
                          <code className="font-mono font-medium text-gray-900">
                            {delta.order_id}
                          </code>
                        </td>
                        <td className="py-2.5 pr-3 text-gray-500">
                          {delta.before_assignment
                            ? `${delta.before_assignment.service_id} · ${delta.before_assignment.slot_id}`
                            : "미배정"}
                        </td>
                        <td className="py-2.5 text-gray-500">
                          {delta.after_assignment
                            ? `${delta.after_assignment.service_id} · ${delta.after_assignment.slot_id}`
                            : "미배정"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                영향 주문 {view.impactedOrderIds.length}건 —{" "}
                <code className="font-mono">{view.impactedOrderIds.join(", ")}</code>
              </p>
            </Section>
          </>
        )}

        <Alert type="info">
          <strong className="text-gray-900">핵심</strong> — 대안은 승인된 변경만 새 시나리오에서
          계산하며, 원안을 덮어쓰지 않습니다. 중량·규격·경로 한도·납기를 바꾸는 변경은 정책이
          금지하므로 요청 자체가 거부됩니다.
        </Alert>
      </main>
    </div>
  );
}
