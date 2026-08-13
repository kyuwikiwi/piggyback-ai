import Link from "next/link";

import { askQuestion } from "@/lib/api";
import { Alert, Section, StatusBadge } from "@/components/ui";
import { ScenarioChrome } from "../ScenarioChrome";
import { reasonLabel } from "@/lib/view/reasons";
import { loadScenarioView } from "@/lib/view/scenario";
import { permittedAdjustments } from "@/lib/view/snapshot";
import { searchAlternative } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "AI" };

/**
 * AI — 이 제품에서 모델이 하는 일 전부, 그리고 하지 않는 일.
 *
 * 네 자리에 흩어져 있었다. 묻기는 긴 페이지 맨 아래, 제안은 주문을 클릭해야 열리는
 * 옆 패널 안, 문구 읽기는 다른 주소, 모델 상태는 랜딩 각주 한 줄. 전부 있는데 아무도
 * 못 본다.
 *
 * 모아 놓되 경계를 같이 적는다. 이 제품이 주장하는 건 "모델이 제안하고 답하고
 * 나누되, 판정하지 않는다"이고, 그 주장은 가드가 실제로 무엇을 걸렀는지를 보여줄 때만
 * 검증 가능하다 -- 그래서 `replaced_reasons`와 `refused_reason`이 이 화면의 본문이다.
 */
export default async function AiTab({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string }>;
  searchParams: Promise<{
    run?: string;
    q?: string;
    altmiss?: string;
    altreason?: string;
  }>;
}) {
  const { scenarioId } = await params;
  const {
    run: runParam,
    q: question,
    altmiss: alternativeMissFor,
    altreason: alternativeMissReason,
  } = await searchParams;

  const view = await loadScenarioView(scenarioId, runParam);
  const { idx, run, runId, rows, explanation, ai } = view;

  const base = `/scenarios/${encodeURIComponent(scenarioId)}`;

  // Asking is a POST because the question is a body, but nothing is stored, so
  // the same question always gets the same treatment and the URL stays
  // reloadable and shareable.
  const answered =
    runId && question?.trim() ? await askQuestion(runId, question.trim()) : null;

  const proposed = rows.filter((row) => row.suggestion);
  const guarded = Object.entries(explanation?.replaced_reasons ?? {});
  const unmatched = explanation?.unmatched_order_ids ?? [];

  return (
    <ScenarioChrome view={view} tab="ai">
      {/* 경계는 한 줄로 못박는다. 아래 섹션 제목이 이미 "제안"과 "묻기"라고
          말하고 있으니, 무엇을 하는지는 설명할 필요가 없다. */}
      <div className="panel px-5 py-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-sm font-semibold text-ink">생성형 레이어</span>
        <StatusBadge label={ai.llm_available ? "연결됨" : "연결 안 됨"} size="sm" />
        <code className="font-mono text-[13px] text-ink-2">
          {ai.llm_available ? "LLM" : ai.fallback}
        </code>
        {explanation && (
          <span className="text-[13px] text-ink-3">
            설명 <code className="font-mono">{explanation.source}</code>
            {explanation.suggestion_source && (
              <>
                {" · "}제안 <code className="font-mono">{explanation.suggestion_source}</code>
              </>
            )}
          </span>
        )}
        <span className="ml-auto text-[13px] text-ink-3">판정과 편성은 솔버가 합니다</span>
      </div>

      {!run ? (
        <Section title="아직 실행이 없습니다" subdued>
          <p className="text-sm text-ink-2">
            <Link href={base} className="text-korail-blue hover:underline">
              편성 탭
            </Link>
            에서 먼저 실행하세요.
          </p>
        </Section>
      ) : (
        <>
          {alternativeMissFor && (
            <Alert type="warning">
              <strong className="text-ink">
                {alternativeMissFor} — 허용 범위 안에 실행 가능한 대안이 없습니다.
              </strong>
              {alternativeMissReason && (
                <>
                  <br />
                  사유 <code className="font-mono text-[13px]">{alternativeMissReason}</code> —{" "}
                  {reasonLabel(alternativeMissReason)}
                </>
              )}
            </Alert>
          )}

          <Section
            title="편성 결과 질문"
          >
            <div className="flex flex-col gap-3">
              {/* A GET form: asking stores nothing, so the question belongs in
                  the URL where it can be reloaded and shared. */}
              <form method="get" className="flex flex-wrap gap-2">
                <input
                  type="text"
                  name="q"
                  defaultValue={question ?? ""}
                  maxLength={500}
                  placeholder="예: 왜 ORD-004가 밀렸나요?"
                  className="field flex-1 min-w-[280px]"
                />
                <button type="submit" className="btn btn-primary">
                  질문
                </button>
              </form>

              {!answered ? (
                <div className="flex flex-wrap gap-1.5">
                  {["왜 ORD-004가 밀렸나요?", "불가한 주문은 몇 건인가요?"].map((sample) => (
                    <Link
                      key={sample}
                      href={`${base}/ai?q=${encodeURIComponent(sample)}`}
                      className="text-[13px] text-ink-2 border border-line rounded-md px-2 py-1 hover:border-line-strong hover:text-ink"
                    >
                      {sample}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {answered.grounded ? (
                    <p className="text-sm text-ink leading-6">{answered.answer}</p>
                  ) : answered.source === "UNAVAILABLE" ? (
                    <p className="text-sm text-ink-3 leading-6">{answered.answer}</p>
                  ) : (
                    // Withheld, not failed. The operator has to know the
                    // difference between "no answer" and "an answer I can trust".
                    <Alert type="warning">
                      <strong className="text-ink">
                        답변이 이 실행의 사실과 맞지 않아 표시하지 않았습니다.
                      </strong>
                      <br />
                      <code className="text-[13px] font-mono">{answered.refused_reason}</code>
                    </Alert>
                  )}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
                    <span>
                      출처 <code className="font-mono">{answered.source}</code> · 근거 검사{" "}
                      <span className={answered.grounded ? "text-ok" : "text-warn"}>
                        {answered.grounded ? "통과" : "보류"}
                      </span>
                    </span>
                    {answered.used_order_ids.length > 0 && (
                      <>
                        <span className="text-line-strong">·</span>
                        <span>참조한 주문</span>
                        {answered.used_order_ids.map((orderId) => (
                          <Link
                            key={orderId}
                            href={`${base}?order=${encodeURIComponent(orderId)}`}
                            className="font-mono text-korail-blue hover:underline"
                          >
                            {orderId}
                          </Link>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Section>

          <Section
            title="대안 제안"
            headerRight={
<span className="text-[13px] tabular-nums">{proposed.length}건</span>
            }
          >
            {proposed.length === 0 ? (
              <p className="text-sm text-ink-2">
                제안할 것이 없습니다.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {proposed.map((row) => {
                  const order = idx.orderById.get(row.orderId);
                  const adjustments = permittedAdjustments(order);
                  return (
                    <div
                      key={row.orderId}
                      className="border-l-2 border-korail-blue/40 pl-3 py-1 flex flex-col gap-1.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`${base}?order=${encodeURIComponent(row.orderId)}`}
                          className="font-mono text-sm font-semibold text-korail-blue hover:underline"
                        >
                          {row.orderId}
                        </Link>
                        {row.displayLabel && (
                          <StatusBadge label={row.displayLabel} size="sm" />
                        )}
                        {row.alternativeScenarioId && (
                          <Link
                            href={`/scenarios/${encodeURIComponent(row.alternativeScenarioId)}`}
                            className="text-[13px] text-korail-blue hover:underline"
                          >
                            이미 찾은 대안 열기
                          </Link>
                        )}
                      </div>

                      <p className="text-sm text-ink-2 leading-6 max-w-[76ch]">
                        {row.suggestion?.reason}
                      </p>

                      {runId && adjustments.length > 0 && !row.alternativeScenarioId && (
                        <form
                          action={searchAlternative}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <input type="hidden" name="scenario_id" value={scenarioId} />
                          <input type="hidden" name="order_id" value={row.orderId} />
                          <input type="hidden" name="run_id" value={runId} />
                          <input type="hidden" name="from" value="ai" />
                          {adjustments.map((adjustment) => (
                            <label
                              key={adjustment}
                              className="flex items-center gap-1.5 text-[13px] text-ink-2"
                            >
                              <input
                                type="checkbox"
                                name="adjustments"
                                value={adjustment}
                                // Exactly the proposed set, which is usually one:
                                // an order approved for two is otherwise always
                                // asked about both, and the derived plan cannot
                                // then say which was needed.
                                defaultChecked={row.suggestion?.types.includes(adjustment)}
                                className="accent-korail-blue"
                              />
                              <span className="font-mono">{adjustment}</span>
                            </label>
                          ))}
                          <button type="submit" className="btn">
                            대안 검토
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section title="문장에서 주문 정보 추출" subdued>
              <p className="text-sm text-ink-2 leading-6">
                의뢰 문장에서 주문 정보를 추출합니다. 확정할 수 없는 값은 비워 둡니다.
              </p>
              <Link href={`${base}/orders/new`} className="btn mt-2.5">
                문장으로 주문 추가
              </Link>
            </Section>

            {/* 가드가 실제로 무엇을 걸렀는지. 이 블록이 비어 있는 것도 결과다. */}
            <Section
              title="차단된 모델 응답"
              subdued
              headerRight={
                guarded.length + unmatched.length > 0 ? (
                  <span className="text-[13px] tabular-nums">
                    {guarded.length + unmatched.length}건
                  </span>
                ) : null
              }
            >
              {guarded.length === 0 && unmatched.length === 0 ? (
                <p className="text-sm text-ink-2 leading-6">
                  없습니다.
                </p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {guarded.map(([orderId, guard]) => (
                    <li key={orderId} className="flex flex-wrap items-baseline gap-x-2">
                      <code className="font-mono font-medium text-ink">{orderId}</code>
                      <span className="text-warn">문장 교체됨</span>
                      <code className="font-mono text-[13px] text-ink-3">{guard}</code>
                    </li>
                  ))}
                  {unmatched.map((orderId) => (
                    <li key={orderId} className="flex flex-wrap items-baseline gap-x-2">
                      <code className="font-mono font-medium text-ink">{orderId}</code>
                      <span className="text-bad">이 실행에 없는 주문</span>
                      
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </>
      )}
    </ScenarioChrome>
  );
}
