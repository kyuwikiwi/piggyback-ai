import { revalidatePath } from "next/cache";
import Link from "next/link";

import { getExplanation, getExportBundle, getRun, recordDecision } from "@/lib/api";
import type { ActorRole, DecisionState, SelectedPlan } from "@/lib/api";
import { Alert, Header, Section, StatCard, StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/view/format";
import { reasonLabel } from "@/lib/view/reasons";

export const dynamic = "force-dynamic";

const AXIS_TONE: Record<string, string> = {
  VALID: "text-emerald-600",
  REVIEW_REQUIRED: "text-amber-600",
  ELIGIBLE: "text-emerald-600",
  INELIGIBLE: "text-red-600",
  NOT_EVALUATED: "text-gray-400",
  ASSIGNED: "text-emerald-600",
  UNASSIGNED: "text-amber-600",
  NOT_APPLICABLE: "text-gray-400",
  AVAILABLE: "text-blue-600",
  NONE: "text-red-600",
  NOT_SEARCHED: "text-gray-400",
};

export default async function DecisionsPage({
  params,
}: {
  params: Promise<{ scenarioId: string; runId: string }>;
}) {
  const { scenarioId, runId } = await params;

  // The display label is computed by P4b, so it arrives on the explanation
  // cards rather than on the run's own order_outcomes, where it stays null.
  const [run, bundle, explanation] = await Promise.all([
    getRun(runId),
    getExportBundle(runId),
    getExplanation(runId),
  ]);
  const labelByOrder = new Map(explanation.cards.map((c) => [c.order_id, c]));

  // 05 §5: only an OPTIMAL solve that the independent validator passed may be
  // accepted. Asking anyway is a 409, so the option is closed here rather than
  // offered and refused.
  const acceptable = run.solver_status === "OPTIMAL" && run.validator_status === "PASS";

  async function submitDecision(formData: FormData) {
    "use server";

    await recordDecision(runId, {
      decision_state: formData.get("decision_state") as DecisionState,
      actor_role: formData.get("actor_role") as ActorRole,
      reason: String(formData.get("reason") ?? "").trim(),
      selected_plan: formData.get("selected_plan") as SelectedPlan,
    });

    revalidatePath(`/scenarios/${scenarioId}/runs/${runId}/decisions`);
  }

  const outcomes = run.order_outcomes;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* 결정만 대시보드에서 떼어 둔다. 되돌릴 수 없는 POST이고, 어떤 실행을
          두고 내린 결정인지의 경계가 주소로 남아 있어야 재현성 해시와 함께
          추적된다. */}
      <header className="bg-white border-b border-gray-200">
        <Header />
        <div className="max-w-[1060px] mx-auto px-6 py-5">
          <Link
            href={`/scenarios/${encodeURIComponent(scenarioId)}?run=${encodeURIComponent(runId)}`}
            className="text-sm text-korail-blue hover:underline"
          >
            ← 편성 대시보드
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">결정 기록</h1>
          <p className="text-sm text-gray-500 mt-1">
            운영자가 이 실행을 채택·보류·반려하고, 근거와 함께 남깁니다
          </p>
        </div>
      </header>

      <main className="max-w-[1060px] mx-auto px-6 py-8 flex flex-col gap-5">
        <div className="flex flex-wrap gap-4">
          <StatCard
            value={outcomes.filter((o) => o.assignment_state === "ASSIGNED").length}
            label="배정"
            color="green"
          />
          <StatCard
            value={outcomes.filter((o) => o.eligibility_state === "INELIGIBLE").length}
            label="부적합"
            color="red"
          />
          <StatCard value={run.solver_status} label="솔버" color="blue" />
          <StatCard value={run.validator_status} label="독립 검증" color={acceptable ? "green" : "red"} />
        </div>

        <Section title="주문별 상태축" accent="blue">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-200">
                  <th className="py-2 pr-3 font-medium">주문</th>
                  <th className="py-2 pr-3 font-medium">입력</th>
                  <th className="py-2 pr-3 font-medium">적합성</th>
                  <th className="py-2 pr-3 font-medium">배정</th>
                  <th className="py-2 pr-3 font-medium">대안</th>
                  <th className="py-2 font-medium">표시</th>
                </tr>
              </thead>
              <tbody>
                {outcomes.map((o) => {
                  const card = labelByOrder.get(o.order_id);
                  return (
                  <tr key={o.order_id} className="border-b border-gray-100">
                    <td className="py-2.5 pr-3">
                      <code className="font-mono font-medium text-gray-900">{o.order_id}</code>
                    </td>
                    <td className={`py-2.5 pr-3 font-mono text-xs ${AXIS_TONE[o.input_state] ?? ""}`}>
                      {o.input_state}
                    </td>
                    <td className={`py-2.5 pr-3 font-mono text-xs ${AXIS_TONE[o.eligibility_state] ?? ""}`}>
                      {o.eligibility_state}
                    </td>
                    <td className={`py-2.5 pr-3 font-mono text-xs ${AXIS_TONE[o.assignment_state] ?? ""}`}>
                      {o.assignment_state}
                    </td>
                    <td className={`py-2.5 pr-3 font-mono text-xs ${AXIS_TONE[o.alternative_state] ?? ""}`}>
                      {o.alternative_state}
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {card?.display_label ? (
                          <StatusBadge label={card.display_label} size="sm" />
                        ) : (
                          <span className="text-xs text-gray-400">
                            {reasonLabel(o.primary_reason_code)}
                          </span>
                        )}
                        {(card?.display_badges ?? o.display_badges)?.map((b) => (
                          <StatusBadge key={b} label={b} size="sm" />
                        ))}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            표시 라벨과 배지는 네 상태축에서 계산된 값입니다. 이 화면이 만들지 않습니다.
          </p>
        </Section>

        <Section title="이 실행에 대한 결정" accent="amber">
          <form action={submitDecision} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-gray-500">결정</span>
                <select
                  name="decision_state"
                  defaultValue={acceptable ? "ACCEPTED" : "HELD"}
                  className="h-10 rounded-lg border border-gray-300 px-3 text-gray-900"
                >
                  <option value="ACCEPTED" disabled={!acceptable}>
                    채택 (ACCEPTED){acceptable ? "" : " — OPTIMAL + 검증 PASS만 가능"}
                  </option>
                  <option value="HELD">보류 (HELD)</option>
                  <option value="REJECTED">반려 (REJECTED)</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-gray-500">역할</span>
                <select
                  name="actor_role"
                  defaultValue="SCHEDULING_OPERATOR"
                  className="h-10 rounded-lg border border-gray-300 px-3 text-gray-900"
                >
                  <option value="SCHEDULING_OPERATOR">편성 운영자</option>
                  <option value="PLANNING_OWNER">계획 책임자</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-gray-500">선택한 안</span>
                <select
                  name="selected_plan"
                  defaultValue="BASELINE"
                  className="h-10 rounded-lg border border-gray-300 px-3 text-gray-900"
                >
                  <option value="BASELINE">기본안</option>
                  <option value="ALTERNATIVE">대안</option>
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-gray-500">근거</span>
              <input
                name="reason"
                required
                minLength={1}
                placeholder="예: 배정 3건 모두 하드 제약을 만족하고 독립 검증을 통과함"
                className="h-10 rounded-lg border border-gray-300 px-3 text-gray-900"
              />
            </label>

            <button
              type="submit"
              className="self-start h-10 px-5 rounded-full bg-korail-blue text-white text-sm font-semibold hover:bg-[#004080]"
            >
              결정 기록
            </button>
          </form>

          {!acceptable && (
            <Alert type="warning" className="mt-4">
              이 실행은 <code className="font-mono">{run.solver_status}</code> ·{" "}
              <code className="font-mono">{run.validator_status}</code>이므로 채택할 수
              없습니다. 보류하거나 반려할 수 있습니다.
            </Alert>
          )}
        </Section>

        <Section title="기록된 결정" accent="green">
          {bundle.decisions.length === 0 ? (
            <p className="text-sm text-gray-500">아직 기록된 결정이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {bundle.decisions.map((d) => (
                <div
                  key={d.decision_id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm"
                >
                  <StatusBadge label={d.decision_state} size="sm" />
                  <code className="font-mono text-xs text-gray-400">{d.decision_id}</code>
                  <span className="ml-auto text-xs text-gray-400">
                    {formatDateTime(d.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="재현성" accent="muted">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">시나리오</dt>
              <dd className="font-mono text-gray-900">{run.scenario_id}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">정책</dt>
              <dd className="font-mono text-gray-900">
                {bundle.input_snapshot.policy.policy_id} v
                {bundle.input_snapshot.policy.policy_version}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">seed · worker · 제한</dt>
              <dd className="font-mono text-gray-900">
                {run.reproducibility.solver_parameters.random_seed} ·{" "}
                {run.reproducibility.solver_parameters.num_search_workers} ·{" "}
                {run.reproducibility.solver_parameters.max_time_seconds}초
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">추적 이벤트</dt>
              <dd className="font-mono text-gray-900">{bundle.trace_events.length}건</dd>
            </div>
            <div className="md:col-span-2 flex flex-col gap-1 pt-2 border-t border-gray-100">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">입력 해시</dt>
                <dd className="font-mono text-xs text-gray-900 break-all">
                  {run.reproducibility.input_snapshot_sha256}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">정책 해시</dt>
                <dd className="font-mono text-xs text-gray-900 break-all">
                  {run.reproducibility.policy_sha256}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">결과 해시</dt>
                <dd className="font-mono text-xs text-gray-900 break-all">
                  {run.reproducibility.result_sha256}
                </dd>
              </div>
            </div>
          </dl>
        </Section>

        <Alert type="info">
          <strong className="text-gray-900">핵심</strong> — 결정은 실행 단위로 남습니다. 같은
          입력·정책·솔버 설정이면 같은 해시가 나오므로, 기록된 결정이 어떤 계산을 두고 내려진
          것인지 나중에 확인할 수 있습니다.
        </Alert>
      </main>
    </div>
  );
}
