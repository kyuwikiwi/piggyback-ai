import { revalidatePath } from "next/cache";
import Link from "next/link";

import { getExplanation, getExportBundle, getRun, getScenario, recordDecision } from "@/lib/api";
import type { ActorRole, DecisionState, SelectedPlan } from "@/lib/api";
import { Alert, Header, Section, StatCard, StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/view/format";
import { reasonLabel } from "@/lib/view/reasons";

export const dynamic = "force-dynamic";

/**
 * The five things the service records against a scenario.
 *
 * Shown as a list rather than counted. "추적 이벤트 12건" is a claim about an
 * audit trail; the trail itself is the evidence, and it was already in the
 * bundle this page fetches.
 */
const TRACE_LABEL: Record<string, string> = {
  SCENARIO_CREATED: "시나리오 생성",
  VALIDATION_COMPLETED: "입력 검증 완료",
  RUN_COMPLETED: "편성 실행 완료",
  ALTERNATIVE_CREATED: "대안 검토",
  DECISION_RECORDED: "결정 기록",
};

/**
 * The axes in words, with the enum kept beside them.
 *
 * The five axes stay separate on purpose (02 §4), and showing them is how this
 * screen proves it -- but `NOT_APPLICABLE` in a column headed 배정 is a schema
 * dump sitting in the middle of an operator's decision. The reading comes
 * first and the raw value stays underneath it, small, so the claim is still
 * checkable against the export.
 */
const AXIS_READING: Record<string, { text: string; tone: string }> = {
  VALID: { text: "유효", tone: "text-emerald-600" },
  REVIEW_REQUIRED: { text: "확인 필요", tone: "text-amber-600" },
  ELIGIBLE: { text: "적합", tone: "text-emerald-600" },
  INELIGIBLE: { text: "부적합", tone: "text-red-600" },
  NOT_EVALUATED: { text: "미평가", tone: "text-gray-400" },
  ASSIGNED: { text: "배정됨", tone: "text-emerald-600" },
  UNASSIGNED: { text: "미배정", tone: "text-amber-600" },
  NOT_APPLICABLE: { text: "해당 없음", tone: "text-gray-400" },
  AVAILABLE: { text: "있음", tone: "text-blue-600" },
  NONE: { text: "없음", tone: "text-red-600" },
  NOT_SEARCHED: { text: "미검토", tone: "text-gray-400" },
};

function Axis({ value }: { value: string }) {
  const reading = AXIS_READING[value];
  return (
    <span className="flex flex-col leading-tight">
      <span className={`text-sm ${reading?.tone ?? "text-gray-500"}`}>
        {reading?.text ?? value}
      </span>
      <code className="text-[10px] font-mono text-gray-300">{value}</code>
    </span>
  );
}

export default async function DecisionsPage({
  params,
}: {
  params: Promise<{ scenarioId: string; runId: string }>;
}) {
  const { scenarioId, runId } = await params;

  // The display label is computed by P4b, so it arrives on the explanation
  // cards rather than on the run's own order_outcomes, where it stays null.
  const [run, bundle, explanation, scenario] = await Promise.all([
    getRun(runId),
    getExportBundle(runId),
    getExplanation(runId),
    getScenario(scenarioId),
  ]);
  // A decision is recorded against one run. On a derived scenario that run is
  // the alternative, so `기본안` would be the wrong word for what is being
  // accepted -- the choice follows the lineage rather than asking the operator
  // to remember which plan this page belongs to.
  const isDerived = scenario.parent_scenario_id !== null;
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
            href={`/scenarios/${encodeURIComponent(scenarioId)}`}
            className="text-sm text-korail-blue hover:underline"
          >
            ← 편성 대시보드
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-3 mt-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">결정 기록</h1>
              <p className="text-sm text-gray-500 mt-1">
                운영자가 이 실행을 채택·보류·반려하고, 근거와 함께 남깁니다
              </p>
            </div>
            {/* A plain link, not fetch-and-blob: the browser saves the bytes the
                service sent, which is what a verification bundle has to be. */}
            <a
              href={`/scenarios/${encodeURIComponent(scenarioId)}/runs/${encodeURIComponent(runId)}/export`}
              download
              className="h-9 px-4 rounded-full border border-gray-300 text-sm font-medium text-gray-700 flex items-center hover:border-korail-blue hover:text-korail-blue"
            >
              검증 번들 내려받기
            </a>
          </div>
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
                    <td className="py-2.5 pr-3">
                      <Axis value={o.input_state} />
                    </td>
                    <td className="py-2.5 pr-3">
                      <Axis value={o.eligibility_state} />
                    </td>
                    <td className="py-2.5 pr-3">
                      <Axis value={o.assignment_state} />
                    </td>
                    <td className="py-2.5 pr-3">
                      <Axis value={o.alternative_state} />
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
                  defaultValue={isDerived ? "ALTERNATIVE" : "BASELINE"}
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

        <Section
          title="추적 로그"
          accent="cyan"
          headerRight={
            <span className="text-xs text-gray-400">{bundle.trace_events.length}건</span>
          }
        >
          {bundle.trace_events.length === 0 ? (
            <p className="text-sm text-gray-500">기록된 이벤트가 없습니다.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {bundle.trace_events.map((event) => (
                <li
                  key={event.event_id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-2 border-gray-200 pl-3 py-0.5"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {TRACE_LABEL[event.event_type] ?? event.event_type}
                  </span>
                  <code className="text-[11px] font-mono text-gray-400">
                    {event.event_type}
                  </code>
                  <span className="ml-auto text-xs text-gray-400">
                    {formatDateTime(event.occurred_at)}
                  </span>
                </li>
              ))}
            </ol>
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
              <dt className="text-gray-500">실행</dt>
              <dd className="font-mono text-gray-900">{runId}</dd>
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
