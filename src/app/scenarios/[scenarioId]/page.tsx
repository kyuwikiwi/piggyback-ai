import { CANONICAL_SOLVER_PARAMETERS } from "@/lib/api";
import {
  Alert,
  OrderPanel,
  OrderTray,
  Section,
  WagonDiagram,
} from "@/components/ui";
import { ScenarioChrome } from "./ScenarioChrome";
import type { PanelAxis, TrayEntry } from "@/components/ui";
import { constraintComparison } from "@/lib/view/constraints";
import { formatTime } from "@/lib/view/format";
import { reasonLabel } from "@/lib/view/reasons";
import { loadScenarioView, type OrderRow } from "@/lib/view/scenario";
import { permittedAdjustments, terminalName } from "@/lib/view/snapshot";
import { solveScenario, searchAlternative } from "./actions";

export const dynamic = "force-dynamic";

/**
 * 편성 — 이 실행이 무엇을 어디에 실었나.
 *
 * 예전에는 한 페이지가 입력·타임라인·편성·묻기·기준 운행 바꾸기·기본안 대비를
 * 전부 세로로 쌓았다. 순서는 맞았지만 한 화면에 답이 여섯 개라, 정작 제일 자주
 * 하는 질문("무엇이 실렸고 무엇이 안 실렸나")이 나머지 다섯에 묻혔다.
 *
 * 이 탭은 그 질문 하나만 답한다. 나머지는 옆 탭에 있고, 머리말의 요약 줄은 어느
 * 탭에서나 그대로다.
 */
export default async function PlanTab({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string }>;
  searchParams: Promise<{
    run?: string;
    order?: string;
    altmiss?: string;
    altreason?: string;
  }>;
}) {
  const { scenarioId } = await params;
  const {
    run: runParam,
    order: selectedOrderId,
    altmiss: alternativeMissFor,
    altreason: alternativeMissReason,
  } = await searchParams;

  const view = await loadScenarioView(scenarioId, runParam);
  const {
    snapshot,
    idx,
    run,
    runId,
    validation,
    rows,
    review,
    assigned,
    waiting,
    pending,
    ineligible,
    unclassified,
    capacity,
    cardByOrder,
  } = view;

  const base = `/scenarios/${encodeURIComponent(scenarioId)}`;
  const withOrder = (orderId?: string) =>
    orderId ? `${base}?order=${encodeURIComponent(orderId)}` : base;

  function toEntry(row: OrderRow): TrayEntry {
    const order = idx.orderById.get(row.orderId);
    return {
      orderId: row.orderId,
      label: row.displayLabel,
      badges: row.displayBadges,
      comparison: constraintComparison(idx, row.comparable, order),
      // Counting occupied slots is the honest form of 슬롯 경합: the code says
      // there was contention, these two numbers say how tight it was.
      note:
        row.primaryReasonCode === "CAPACITY_CONFLICT" && order
          ? `${order.priority_class} · 슬롯 ${assigned.length}/${capacity} 사용 중`
          : row.detail,
      detailHref: withOrder(row.orderId),
      selected: row.orderId === selectedOrderId,
      // The tray row says a model has something to say about this order; the
      // sentence itself lives on the AI tab and in the panel.
      suggested: row.suggestion !== null,
    };
  }

  const selected = rows.find((r) => r.orderId === selectedOrderId) ?? null;
  const selectedOrder = selected ? idx.orderById.get(selected.orderId) : undefined;
  const selectedAdjustments = permittedAdjustments(selectedOrder);
  const selectedCard = selected ? cardByOrder.get(selected.orderId) : undefined;

  return (
    <ScenarioChrome view={view} tab="plan">
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

      {/* 입력이 걸린 주문만 이 줄에 남는다. 자세한 건 타임라인 탭이 아니라
          여기서 끝내는 게 맞다 -- 편성이 왜 여덟 건만 다뤘는지의 답이니까. */}
      <div className="panel px-5 py-3.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-sm font-semibold text-ink">입력</span>
        {!validation ? (
          <span className="text-ink-2">아직 검증하지 않았습니다</span>
        ) : review.length === 0 ? (
          <span className="text-ink-2">주문 {rows.length}건 모두 유효</span>
        ) : (
          review.map((row) => (
            <span key={row.orderId} className="text-ink-2">
              <code className="font-mono font-medium text-ink">{row.orderId}</code>{" "}
              {reasonLabel(row.primaryReasonCode)}
              {row.missingFields.length > 0 && (
                <>
                  {" · "}
                  <code className="text-[13px] text-warn">{row.missingFields.join(", ")}</code>
                </>
              )}
            </span>
          ))
        )}
        <span className="ml-auto text-[13px] text-ink-3">
          유효 {rows.length - review.length}건
        </span>
      </div>

      {!run && (
        <Section
          title="편성"
          headerRight={<span className="text-[13px]">아직 실행되지 않았습니다</span>}
        >
          <form action={solveScenario} className="flex flex-col gap-4">
            <input type="hidden" name="scenario_id" value={scenarioId} />
            <p className="text-sm text-ink-2">
              {validation
                ? "검증은 끝났습니다. 편성을 실행하세요."
                : "입력을 검증한 뒤 편성을 실행합니다."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg">
              {(
                [
                  ["random_seed", "seed", CANONICAL_SOLVER_PARAMETERS.random_seed, 0],
                  [
                    "max_time_seconds",
                    "제한 (초)",
                    CANONICAL_SOLVER_PARAMETERS.max_time_seconds,
                    1,
                  ],
                ] as const
              ).map(([name, label, value, min]) => (
                <label key={name} className="field-label">
                  <span>{label}</span>
                  <input
                    type="number"
                    name={name}
                    min={min}
                    defaultValue={value}
                    className="field font-mono"
                  />
                </label>
              ))}
              <div className="field-label">
<span>worker · 고정</span>
                <div className="field field-disabled flex items-center bg-sunken font-mono text-ink-3">
                  {CANONICAL_SOLVER_PARAMETERS.num_search_workers}
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary self-start">
              편성 실행
            </button>

            <p className="text-[13px] text-ink-3">
              기본값으로 실행해야 정본 기대값과 해시가 맞습니다.
            </p>
          </form>
        </Section>
      )}

      {run && (
        <Section
          title="편성"
          headerRight={<code className="text-[13px] font-mono">{run.run_id}</code>}
        >
          <div
            className={`grid gap-5 ${
              selected ? "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_264px]" : "grid-cols-1"
            }`}
          >
            <div className="flex flex-col gap-5">
              {snapshot.baseline_service_ids.map((serviceId) => {
                const service = idx.serviceById.get(serviceId);
                return (
                  <div key={serviceId} className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                      <code className="font-mono font-semibold text-ink">{serviceId}</code>
                      {service && (
                        <span className="text-ink-2">
                          {terminalName(idx, service.origin_terminal_id)} →{" "}
                          {terminalName(idx, service.destination_terminal_id)} · 반입 마감{" "}
                          <span className="font-medium text-ink">
                            {formatTime(service.planning_cutoff_at)}
                          </span>{" "}
                          · 출발 {formatTime(service.departure_at)} · 도착{" "}
                          {formatTime(service.arrival_at)}
                        </span>
                      )}
                    </div>
                    <WagonDiagram
                      idx={idx}
                      serviceId={serviceId}
                      assignments={run.assignments}
                      highlightOrderId={selectedOrderId ?? null}
                    />
                  </div>
                );
              })}

              <div className="flex flex-col gap-4 pt-1">
                <OrderTray
                  tone="warning"
                  title="대기 — 자리만 나면 이 열차"
                  entries={waiting.map(toEntry)}
                />
                <OrderTray tone="muted" title="편성 대기" entries={pending.map(toEntry)} />
                <OrderTray
                  tone="danger"
                  title="이 열차로는 불가"
                  entries={ineligible.map(toEntry)}
                />
                <OrderTray tone="muted" title="확인 필요" entries={review.map(toEntry)} />
                <OrderTray
                  tone="muted"
                  title="분류되지 않음"
                  entries={unclassified.map(toEntry)}
                />
              </div>
            </div>

            {selected && (
              <OrderPanel
                orderId={selected.orderId}
                label={selected.displayLabel}
                badges={selected.displayBadges}
                axes={
                  [
                    {
                      label: "입력",
                      value: selected.inputState,
                      tone: selected.inputState === "VALID" ? "ok" : "bad",
                    },
                    {
                      label: "적합성",
                      value: selected.eligibilityState,
                      tone:
                        selected.eligibilityState === "ELIGIBLE"
                          ? "ok"
                          : selected.eligibilityState === "INELIGIBLE"
                            ? "bad"
                            : "muted",
                    },
                    {
                      label: "배정",
                      value: selected.assignmentState ?? "—",
                      tone: selected.assignmentState === "ASSIGNED" ? "ok" : "muted",
                    },
                    {
                      label: "대안",
                      value: selected.alternativeState ?? "—",
                      tone: selected.alternativeState === "AVAILABLE" ? "ok" : "muted",
                    },
                    {
                      label: "후보 슬롯",
                      value:
                        selected.eligibleSlotCount === null
                          ? "—"
                          : `${selected.eligibleSlotCount}개`,
                      tone: selected.eligibleSlotCount ? "ok" : "muted",
                    },
                  ] satisfies PanelAxis[]
                }
                comparison={constraintComparison(idx, selected.comparable, selectedOrder)}
                note={selected.detail}
                sourceType={snapshot.assumptions[0]?.source_type ?? "DEMO_ASSUMPTION"}
                closeHref={base}
                editHref={`${base}/orders/${encodeURIComponent(selected.orderId)}/edit`}
                // A found alternative already has a scenario; linking to it beats
                // running the search again and storing a second identical one.
                existingAlternativeHref={
                  selected.alternativeScenarioId
                    ? `/scenarios/${encodeURIComponent(selected.alternativeScenarioId)}`
                    : null
                }
                search={
                  runId &&
                  selected.assignmentState !== "ASSIGNED" &&
                  selected.inputState === "VALID" &&
                  selectedAdjustments.length > 0
                    ? {
                        action: searchAlternative,
                        scenarioId,
                        runId,
                        from: "plan",
                        adjustments: selectedAdjustments,
                        label: "대안 검토",
                        suggestion: selectedCard?.suggestion
                          ? {
                              types: selectedCard.suggested_adjustment_types ?? [],
                              reason: selectedCard.suggestion,
                            }
                          : null,
                      }
                    : null
                }
                blockedLabel={
                  selected.assignmentState === "ASSIGNED" || selected.inputState !== "VALID"
                    ? null
                    : "승인된 변경 없음"
                }
              />
            )}
          </div>
        </Section>
      )}

      {run?.validator_findings && run.validator_findings.length > 0 && (
        <Alert type="error">
          <strong className="text-ink">독립 검증기가 위반을 보고했습니다</strong>
          <ul className="mt-1 list-disc pl-5">
            {run.validator_findings.map((f, i) => (
              <li key={i}>
                <code className="font-mono text-[13px]">{f.check}</code>
                {f.order_id ? ` · ${f.order_id}` : ""} — {f.message}
              </li>
            ))}
          </ul>
        </Alert>
      )}
    </ScenarioChrome>
  );
}
