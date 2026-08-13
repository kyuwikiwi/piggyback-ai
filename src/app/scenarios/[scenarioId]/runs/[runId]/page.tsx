import { getExplanation, getRun, getScenario } from "@/lib/api";
import { Alert, Header, SceneNav, Section, StatCard, StatusBadge } from "@/components/ui";
import { formatTime, formatTonnes } from "@/lib/view/format";
import { reasonLabel } from "@/lib/view/reasons";
import { indexSnapshot, slotsOfService, terminalName, wagonsOfService } from "@/lib/view/snapshot";

export const dynamic = "force-dynamic";

export default async function RunPage({
  params,
}: {
  params: Promise<{ scenarioId: string; runId: string }>;
}) {
  const { scenarioId, runId } = await params;

  const run = await getRun(runId);
  const [scenario, explanation] = await Promise.all([
    getScenario(run.scenario_id),
    getExplanation(runId),
  ]);

  const idx = indexSnapshot(scenario.input_snapshot);
  const assignmentBySlot = new Map(run.assignments.map((a) => [a.slot_id, a]));
  const cardByOrder = new Map(explanation.cards.map((c) => [c.order_id, c]));

  const outcomes = run.order_outcomes;
  const assigned = outcomes.filter((o) => o.assignment_state === "ASSIGNED");
  const capacityConflict = outcomes.filter(
    (o) => o.primary_reason_code === "CAPACITY_CONFLICT",
  );
  const ineligible = outcomes.filter((o) => o.eligibility_state === "INELIGIBLE");
  const review = outcomes.filter((o) => o.input_state === "REVIEW_REQUIRED");
  const unassigned = outcomes.filter((o) => o.assignment_state !== "ASSIGNED");

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header>
        <Header />
        <div className="bg-white px-6 pt-6 pb-4">
          <div className="max-w-[1060px] mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">기본 편성</h1>
            <p className="text-sm text-gray-500 mt-1">
              승인된 기준 운행만으로 계산한 결과입니다
            </p>
          </div>
        </div>
        <SceneNav scenarioId={scenarioId} runId={runId} />
      </header>

      <main className="max-w-[1060px] mx-auto px-6 py-8 flex flex-col gap-5">
        <div className="flex flex-wrap gap-4">
          <StatCard value={assigned.length} label="배정 완료" color="green" />
          <StatCard value={capacityConflict.length} label="슬롯 경합" color="amber" />
          <StatCard value={ineligible.length} label="부적합" color="red" />
          <StatCard value={review.length} label="확인 필요" color="muted" />
        </div>

        <Section
          title="기본안 슬롯 배정"
          accent="green"
          headerRight={
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-gray-400">{run.run_id}</code>
              <StatusBadge label={run.solver_status} size="sm" />
              <StatusBadge label={`검증 ${run.validator_status}`} size="sm" />
            </div>
          }
        >
          <div className="flex flex-col gap-5">
            {scenario.input_snapshot.baseline_service_ids.map((serviceId) => {
              const service = idx.serviceById.get(serviceId);
              const wagons = wagonsOfService(idx, serviceId);
              return (
                <div key={serviceId} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-baseline gap-2 text-sm">
                    <code className="font-mono font-bold text-gray-900">{serviceId}</code>
                    {service && (
                      <span className="text-gray-500">
                        {terminalName(idx, service.origin_terminal_id)} →{" "}
                        {terminalName(idx, service.destination_terminal_id)} · 출발{" "}
                        {formatTime(service.departure_at)} · 도착{" "}
                        {formatTime(service.arrival_at)} · 반입 마감{" "}
                        {formatTime(service.planning_cutoff_at)}
                      </span>
                    )}
                  </div>
                  {wagons.map((wagon) => (
                    <div key={wagon.wagon_id} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <code className="text-xs font-mono font-medium text-gray-500">
                          {wagon.wagon_id}
                        </code>
                        <span className="text-xs text-gray-400">
                          최대 {formatTonnes(wagon.max_total_weight_kg)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {(idx.slotsByWagon.get(wagon.wagon_id) ?? [])
                          .slice()
                          .sort((a, b) => a.position - b.position)
                          .map((slot) => {
                            const assignment = assignmentBySlot.get(slot.slot_id);
                            const order = assignment
                              ? idx.orderById.get(assignment.order_id)
                              : undefined;
                            return (
                              <div
                                key={slot.slot_id}
                                className={`rounded-lg border p-3 text-center ${
                                  assignment
                                    ? "border-emerald-300 bg-emerald-50"
                                    : slot.available
                                      ? "border-dashed border-gray-300 bg-white"
                                      : "border-gray-200 bg-gray-100"
                                }`}
                              >
                                <code className="block text-[11px] font-mono text-gray-400">
                                  {slot.slot_id}
                                </code>
                                {assignment ? (
                                  <>
                                    <div className="mt-1 text-sm font-bold text-gray-900">
                                      {assignment.order_id}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {formatTonnes(order?.gross_weight_kg)}
                                    </div>
                                  </>
                                ) : (
                                  <div className="mt-1 text-sm text-gray-400">
                                    {slot.available ? "비어 있음" : "사용 불가"}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </Section>

        {unassigned.length > 0 && (
          <Section title="미배정 주문" accent="amber">
            <div className="flex flex-col gap-3">
              {unassigned.map((outcome) => {
                const card = cardByOrder.get(outcome.order_id);
                return (
                  <div
                    key={outcome.order_id}
                    className="rounded-xl border border-gray-200 p-4 flex flex-col gap-1.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="font-mono font-bold text-gray-900">
                        {outcome.order_id}
                      </code>
                      {/* GET /v1/runs leaves display_label null; P4b computes
                          it, so the card is where it actually arrives. */}
                      {(card?.display_label ?? outcome.display_label) && (
                        <StatusBadge
                          label={(card?.display_label ?? outcome.display_label)!}
                          size="sm"
                        />
                      )}
                      {(card?.display_badges ?? outcome.display_badges)?.map((badge) => (
                        <StatusBadge key={badge} label={badge} size="sm" />
                      ))}
                      <span className="ml-auto text-xs text-gray-400">
                        {reasonLabel(outcome.primary_reason_code)}
                      </span>
                    </div>
                    {/* Sentences come from the service (P4b) so the screen never
                        invents an explanation the run does not support. */}
                    <p className="text-sm text-gray-500 leading-6">
                      {card?.detail ?? outcome.next_actions?.join(" ") ?? ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {run.validator_findings && run.validator_findings.length > 0 && (
          <Alert type="error">
            <strong className="text-gray-900">독립 검증기가 위반을 보고했습니다</strong>
            <ul className="mt-1 list-disc pl-5">
              {run.validator_findings.map((f, i) => (
                <li key={i}>
                  <code className="font-mono text-xs">{f.check}</code>
                  {f.order_id ? ` · ${f.order_id}` : ""} — {f.message}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        <Alert type="info">
          <strong className="text-gray-900">핵심</strong> — 미배정은 불가와 다릅니다.
          슬롯 경합으로 빠진 주문은 제약을 모두 만족하지만 이번 안에 자리가 없었을 뿐입니다.
        </Alert>
      </main>
    </div>
  );
}
