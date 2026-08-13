import { revalidatePath } from "next/cache";
import Link from "next/link";

import { getExplanation, getExportBundle, getRun, getScenario, recordDecision } from "@/lib/api";
import type { ActorRole, DecisionState, SelectedPlan } from "@/lib/api";
import { Alert, Header, Section, StatBar, StatusBadge } from "@/components/ui";
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
  VALID: { text: "유효", tone: "text-ok" },
  REVIEW_REQUIRED: { text: "확인 필요", tone: "text-warn" },
  ELIGIBLE: { text: "적합", tone: "text-ok" },
  INELIGIBLE: { text: "부적합", tone: "text-bad" },
  NOT_EVALUATED: { text: "미평가", tone: "text-ink-3" },
  ASSIGNED: { text: "배정됨", tone: "text-ok" },
  UNASSIGNED: { text: "미배정", tone: "text-warn" },
  NOT_APPLICABLE: { text: "해당 없음", tone: "text-ink-3" },
  AVAILABLE: { text: "있음", tone: "text-korail-blue" },
  NONE: { text: "없음", tone: "text-bad" },
  NOT_SEARCHED: { text: "미검토", tone: "text-ink-3" },
};

function Axis({ value }: { value: string }) {
  const reading = AXIS_READING[value];
  return (
    <span className="flex flex-col leading-tight">
      <span className={`text-sm ${reading?.tone ?? "text-ink-2"}`}>
        {reading?.text ?? value}
      </span>
      <code className="text-[11px] font-mono text-ink-3/70">{value}</code>
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
    <div className="min-h-screen bg-canvas font-sans">
      {/* 결정만 대시보드에서 떼어 둔다. 되돌릴 수 없는 POST이고, 어떤 실행을
          두고 내린 결정인지의 경계가 주소로 남아 있어야 재현성 해시와 함께
          추적된다. */}
      <header className="bg-white border-b border-line">
        <Header />
        <div className="max-w-[1180px] mx-auto px-6 py-3">
          <Link
            href={`/scenarios/${encodeURIComponent(scenarioId)}`}
            className="text-[13px] text-korail-blue hover:underline"
          >
            ← 편성 대시보드
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-3 mt-1.5">
            <div>
              <h1 className="text-lg font-semibold text-ink">결정 기록</h1>
            </div>
            {/* A plain link, not fetch-and-blob: the browser saves the bytes the
                service sent, which is what a verification bundle has to be. */}
            <a
              href={`/scenarios/${encodeURIComponent(scenarioId)}/runs/${encodeURIComponent(runId)}/export`}
              download
              className="btn"
            >
              검증 번들 내려받기
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-[1180px] mx-auto px-6 py-6 flex flex-col gap-4">
        {/* 솔버와 검증 결과는 세는 값이 아니라 열거값이다. 예전에는 이 자리에
            `OPTIMAL`이 36px로 들어가 있었다 -- 배정 건수와 나란히 같은 크기로 그리면
            둘이 같은 종류의 값처럼 읽힌다. */}
        <StatBar
          stats={[
            {
              label: "배정",
              value: outcomes.filter((o) => o.assignment_state === "ASSIGNED").length,
              tone: "ok",
            },
            {
              label: "부적합",
              value: outcomes.filter((o) => o.eligibility_state === "INELIGIBLE").length,
              tone: "bad",
            },
            {
              label: "솔버",
              value: run.solver_status,
              code: true,
              tone: run.solver_status === "OPTIMAL" ? "ok" : "warn",
            },
            {
              label: "독립 검증",
              value: run.validator_status,
              code: true,
              tone: run.validator_status === "PASS" ? "ok" : "bad",
            },
          ]}
        />

        <Section title="주문별 상태">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[13px] text-ink-3 border-b border-line">
                  <th className="py-2.5 pr-3 font-medium">주문</th>
                  <th className="py-2.5 pr-3 font-medium">입력</th>
                  <th className="py-2.5 pr-3 font-medium">적합성</th>
                  <th className="py-2.5 pr-3 font-medium">배정</th>
                  <th className="py-2.5 pr-3 font-medium">대안</th>
                  <th className="py-2.5 font-medium">표시</th>
                </tr>
              </thead>
              <tbody>
                {outcomes.map((o) => {
                  const card = labelByOrder.get(o.order_id);
                  return (
                  <tr key={o.order_id} className="border-b border-line">
                    <td className="py-3 pr-3">
                      <code className="font-mono font-medium text-ink">{o.order_id}</code>
                    </td>
                    <td className="py-3 pr-3">
                      <Axis value={o.input_state} />
                    </td>
                    <td className="py-3 pr-3">
                      <Axis value={o.eligibility_state} />
                    </td>
                    <td className="py-3 pr-3">
                      <Axis value={o.assignment_state} />
                    </td>
                    <td className="py-3 pr-3">
                      <Axis value={o.alternative_state} />
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {card?.display_label ? (
                          <StatusBadge label={card.display_label} size="sm" />
                        ) : (
                          <span className="text-[13px] text-ink-3">
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
        </Section>

        <Section title="이 실행에 대한 결정">
          <form action={submitDecision} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="field-label">
                <span>결정</span>
                <select
                  name="decision_state"
                  defaultValue={acceptable ? "ACCEPTED" : "HELD"}
                  className="field"
                >
                  <option value="ACCEPTED" disabled={!acceptable}>
                    채택 (ACCEPTED){acceptable ? "" : " — OPTIMAL + 검증 PASS만 가능"}
                  </option>
                  <option value="HELD">보류 (HELD)</option>
                  <option value="REJECTED">반려 (REJECTED)</option>
                </select>
              </label>

              <label className="field-label">
                <span>역할</span>
                <select
                  name="actor_role"
                  defaultValue="SCHEDULING_OPERATOR"
                  className="field"
                >
                  <option value="SCHEDULING_OPERATOR">편성 운영자</option>
                  <option value="PLANNING_OWNER">계획 책임자</option>
                </select>
              </label>

              <label className="field-label">
                <span>선택한 안</span>
                <select
                  name="selected_plan"
                  defaultValue={isDerived ? "ALTERNATIVE" : "BASELINE"}
                  className="field"
                >
                  <option value="BASELINE">기본안</option>
                  <option value="ALTERNATIVE">대안</option>
                </select>
              </label>
            </div>

            <label className="field-label">
              <span>근거</span>
              <input
                name="reason"
                required
                minLength={1}
                placeholder="예: 배정 3건 모두 하드 제약을 만족하고 독립 검증을 통과함"
                className="field"
              />
            </label>

            <button type="submit" className="btn btn-primary self-start">
              결정 기록
            </button>
          </form>

          {!acceptable && (
            <Alert type="warning" className="mt-3">
              이 실행은 <code className="font-mono">{run.solver_status}</code> ·{" "}
              <code className="font-mono">{run.validator_status}</code>이므로 채택할 수
              없습니다. 보류하거나 반려할 수 있습니다.
            </Alert>
          )}
        </Section>

        <Section
          title="기록된 결정"
          subdued={bundle.decisions.length === 0}
          headerRight={
            bundle.decisions.length === 0 ? (
              <span className="text-[13px]">아직 없습니다</span>
            ) : null
          }
        >
          {bundle.decisions.length === 0 ? null : (
            <div className="flex flex-col gap-2">
              {bundle.decisions.map((d) => (
                <div
                  key={d.decision_id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-line px-3 py-2 text-sm"
                >
                  <StatusBadge label={d.decision_state} size="sm" />
                  <code className="font-mono text-[13px] text-ink-3">{d.decision_id}</code>
                  <span className="ml-auto text-[13px] text-ink-3">
                    {formatDateTime(d.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section
          title="추적 로그"
          headerRight={
            <span className="text-[13px]">{bundle.trace_events.length}건</span>
          }
        >
          {bundle.trace_events.length === 0 ? (
            <p className="text-sm text-ink-3">기록된 이벤트가 없습니다.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {bundle.trace_events.map((event) => (
                <li
                  key={event.event_id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-2 border-line pl-3 py-0.5"
                >
                  <span className="text-sm text-ink">
                    {TRACE_LABEL[event.event_type] ?? event.event_type}
                  </span>
                  <code className="text-[13px] font-mono text-ink-3">
                    {event.event_type}
                  </code>
                  <span className="ml-auto text-[13px] text-ink-3">
                    {formatDateTime(event.occurred_at)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="재현성">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-1.5 text-sm">
            <div className="flex gap-3">
              <dt className="w-32 shrink-0 text-ink-3">시나리오</dt>
              <dd className="font-mono text-ink">{run.scenario_id}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-32 shrink-0 text-ink-3">정책</dt>
              <dd className="font-mono text-ink">
                {bundle.input_snapshot.policy.policy_id} v
                {bundle.input_snapshot.policy.policy_version}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-32 shrink-0 text-ink-3">seed · worker · 제한</dt>
              <dd className="font-mono text-ink">
                {run.reproducibility.solver_parameters.random_seed} ·{" "}
                {run.reproducibility.solver_parameters.num_search_workers} ·{" "}
                {run.reproducibility.solver_parameters.max_time_seconds}초
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-32 shrink-0 text-ink-3">실행</dt>
              <dd className="font-mono text-ink">{runId}</dd>
            </div>
            <div className="md:col-span-2 flex flex-col gap-1 pt-2 mt-1 border-t border-line">
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-ink-3">입력 해시</dt>
                <dd className="font-mono text-[13px] text-ink break-all">
                  {run.reproducibility.input_snapshot_sha256}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-ink-3">정책 해시</dt>
                <dd className="font-mono text-[13px] text-ink break-all">
                  {run.reproducibility.policy_sha256}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-32 shrink-0 text-ink-3">결과 해시</dt>
                <dd className="font-mono text-[13px] text-ink break-all">
                  {run.reproducibility.result_sha256}
                </dd>
              </div>
            </div>
          </dl>
        </Section>
      </main>
    </div>
  );
}
