import Link from "next/link";

import {
  createAlternative,
  getExplanation,
  getRun,
  getScenario,
  validateScenario,
} from "@/lib/api";
import type { OrderOutcome } from "@/lib/api";
import {
  Alert,
  CheckItem,
  Header,
  OrderPanel,
  OrderTray,
  Section,
  SourceBadge,
  StatCard,
  StatusBadge,
  Timeline,
  WagonDiagram,
} from "@/components/ui";
import type {
  PanelAxis,
  TimelineMarker,
  TimelineRow,
  TimelineTone,
  TrayEntry,
} from "@/components/ui";
import { buildAlternativeView, describeChange } from "@/lib/view/alternatives";
import { constraintComparison, type ComparableOutcome } from "@/lib/view/constraints";
import { formatTime } from "@/lib/view/format";
import { isTimeReason, reasonLabel } from "@/lib/view/reasons";
import {
  indexSnapshot,
  permittedAdjustments,
  slotsOfService,
  terminalName,
} from "@/lib/view/snapshot";

export const dynamic = "force-dynamic";

/**
 * One scenario, one page.
 *
 * The four screens this replaced -- overview, validate, eligibility, run -- were
 * four renders of a single immutable snapshot and a single run. Splitting them
 * by URL followed the shape of the API, not any question an operator asks, and
 * it cost two identical `POST /validate` calls per walkthrough. The blocks below
 * are stacked in the order the work happens, so scrolling is the flow.
 *
 * `?order=` opens the detail beside the plan; `?alt=` runs a permitted
 * adjustment and draws the derived plan underneath. Both stay in the URL, so a
 * view is still shareable and reloadable.
 */

interface OrderRow {
  orderId: string;
  inputState: OrderOutcome["input_state"];
  eligibilityState: OrderOutcome["eligibility_state"];
  /** Null until a run exists -- there is no assignment to report yet. */
  assignmentState: OrderOutcome["assignment_state"] | null;
  alternativeState: OrderOutcome["alternative_state"] | null;
  primaryReasonCode: string | null;
  displayLabel: string | null;
  displayBadges: readonly string[];
  detail: string | null;
  comparable: ComparableOutcome | null;
}

export default async function ScenarioDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string }>;
  searchParams: Promise<{ run?: string; order?: string; alt?: string }>;
}) {
  const { scenarioId } = await params;
  const { run: runId, order: selectedOrderId, alt: altOrderId } = await searchParams;

  const scenario = await getScenario(scenarioId);

  // Validation is a POST because it recomputes and stores, but it is
  // deterministic over an immutable snapshot, so running it on each visit
  // returns the same answer. Once per visit -- the two screens this replaced
  // each made their own call.
  const [validation, run, explanation] = await Promise.all([
    validateScenario(scenarioId),
    runId ? getRun(runId) : Promise.resolve(null),
    runId ? getExplanation(runId) : Promise.resolve(null),
  ]);

  const idx = indexSnapshot(scenario.input_snapshot);
  const { snapshot } = idx;

  // The search runs only when an order is named in `?alt=`; landing here does
  // nothing. Asking without an approval window would be a 409, so the button
  // that would send it is never offered.
  const altOrder = altOrderId ? idx.orderById.get(altOrderId) : undefined;
  const altAdjustments = permittedAdjustments(altOrder);
  const altOutcome =
    runId && altOrderId && altAdjustments.length
      ? await createAlternative(runId, altOrderId, altAdjustments)
      : null;

  const validationByOrder = new Map(validation.orders.map((o) => [o.order_id, o]));
  const outcomeByOrder = new Map((run?.order_outcomes ?? []).map((o) => [o.order_id, o]));
  const cardByOrder = new Map((explanation?.cards ?? []).map((c) => [c.order_id, c]));

  // A found alternative updates the baseline order's axes -- it now has a
  // derived scenario that can carry it. Without folding that back in, the panel
  // would sit next to a found alternative still saying NOT_SEARCHED.
  if (altOutcome?.found) {
    outcomeByOrder.set(
      altOutcome.baseline_order_update.order_id,
      altOutcome.baseline_order_update,
    );
  }

  // Driven by the snapshot's own order list so nothing can silently drop out of
  // the picture, whichever verdict source is available.
  const rows: OrderRow[] = snapshot.orders.map((order) => {
    const outcome = outcomeByOrder.get(order.order_id);
    const validated = validationByOrder.get(order.order_id);
    const card = cardByOrder.get(order.order_id);
    const primaryReasonCode =
      outcome?.primary_reason_code ?? validated?.primary_reason_code ?? null;

    return {
      orderId: order.order_id,
      inputState: outcome?.input_state ?? validated?.input_state ?? "VALID",
      eligibilityState:
        outcome?.eligibility_state ?? validated?.eligibility_state ?? "NOT_EVALUATED",
      assignmentState: outcome?.assignment_state ?? null,
      alternativeState: outcome?.alternative_state ?? null,
      primaryReasonCode,
      displayLabel: card?.display_label ?? outcome?.display_label ?? null,
      // Badges are additive by contract, and the explanation was fetched before
      // any alternative ran -- union rather than pick, so `조건부 대안 있음`
      // survives next to the card's own badges.
      displayBadges: Array.from(
        new Set([...(card?.display_badges ?? []), ...(outcome?.display_badges ?? [])]),
      ),
      detail:
        card?.detail ??
        (outcome?.next_actions.length ? outcome.next_actions.join(" ") : null) ??
        reasonLabel(primaryReasonCode),
      comparable: outcome ?? (primaryReasonCode ? { primary_reason_code: primaryReasonCode } : null),
    };
  });

  // 02 §4: the axes are stored apart, so these buckets are a reading of them --
  // not a new judgement. Input is checked first because an order held there
  // never reached the others.
  const review = rows.filter((r) => r.inputState === "REVIEW_REQUIRED");
  const assigned = rows.filter((r) => r.assignmentState === "ASSIGNED");
  const waiting = rows.filter(
    (r) =>
      r.inputState === "VALID" &&
      r.eligibilityState === "ELIGIBLE" &&
      r.assignmentState !== null &&
      r.assignmentState !== "ASSIGNED",
  );
  const pending = rows.filter(
    (r) =>
      r.inputState === "VALID" && r.eligibilityState === "ELIGIBLE" && r.assignmentState === null,
  );
  const ineligible = rows.filter(
    (r) => r.inputState === "VALID" && r.eligibilityState === "INELIGIBLE",
  );

  const placed = new Set(
    [...review, ...assigned, ...waiting, ...pending, ...ineligible].map((r) => r.orderId),
  );
  const unclassified = rows.filter((r) => !placed.has(r.orderId));

  const capacity = snapshot.baseline_service_ids
    .flatMap((id) => slotsOfService(idx, id))
    .filter((slot) => slot.available).length;

  const base = `/scenarios/${encodeURIComponent(scenarioId)}`;
  const runQuery = runId ? `run=${encodeURIComponent(runId)}` : "";
  const withParams = (extra: Record<string, string | undefined>) => {
    const parts = [runQuery, ...Object.entries(extra)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)].filter(Boolean);
    return parts.length ? `${base}?${parts.join("&")}` : base;
  };

  const toneOf = (row: OrderRow): TimelineTone => {
    if (row.inputState === "REVIEW_REQUIRED") return "review";
    if (row.assignmentState === "ASSIGNED") return "assigned";
    if (row.eligibilityState === "INELIGIBLE") return "ineligible";
    if (row.assignmentState === null) return "pending";
    return row.eligibilityState === "ELIGIBLE" ? "waiting" : "review";
  };

  const timelineRows: TimelineRow[] = rows.map((row) => {
    const order = idx.orderById.get(row.orderId);
    const tone = toneOf(row);
    return {
      orderId: row.orderId,
      readyAt: order?.ready_at ?? snapshot.as_of,
      dueAt: order?.due_at ?? snapshot.as_of,
      tone,
      aside:
        tone === "ineligible" && !isTimeReason(row.primaryReasonCode)
          ? `시간 아님 · ${reasonLabel(row.primaryReasonCode)}`
          : null,
    };
  });

  const namedMarkers = snapshot.baseline_service_ids.length > 1;
  const timelineMarkers: TimelineMarker[] = snapshot.baseline_service_ids.flatMap((id) => {
    const service = idx.serviceById.get(id);
    if (!service) return [];
    const prefix = namedMarkers ? `${id} ` : "";
    return [
      { label: `${prefix}반입 마감`, at: service.planning_cutoff_at, hard: true },
      { label: `${prefix}출발`, at: service.departure_at },
      { label: `${prefix}도착`, at: service.arrival_at },
    ];
  });

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
      detailHref: withParams({ order: row.orderId }),
      selected: row.orderId === selectedOrderId,
    };
  }

  const selected = rows.find((r) => r.orderId === selectedOrderId) ?? null;
  const selectedOrder = selected ? idx.orderById.get(selected.orderId) : undefined;
  const selectedAdjustments = permittedAdjustments(selectedOrder);

  const [altScenario, altRun] = await Promise.all([
    altOutcome?.found ? getScenario(altOutcome.alternative_scenario_id) : Promise.resolve(null),
    altOutcome?.found ? getRun(altOutcome.alternative_run_id) : Promise.resolve(null),
  ]);
  const altView =
    altOutcome?.found && altScenario
      ? buildAlternativeView(altOutcome, altScenario.input_snapshot)
      : null;
  const altIdx = altScenario ? indexSnapshot(altScenario.input_snapshot) : null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-200">
        <Header />
        <div className="max-w-[1180px] mx-auto px-6 py-5 flex flex-wrap items-center gap-3">
          <code className="text-lg font-bold font-mono text-gray-900">
            {scenario.scenario_id}
          </code>
          <StatusBadge label={scenario.state} size="sm" />
          {run && <StatusBadge label={run.solver_status} size="sm" />}
          {run && (
            <>
              <span className="text-xs text-gray-400">검증</span>
              <StatusBadge label={run.validator_status} size="sm" />
            </>
          )}
          <SourceBadge type={snapshot.assumptions[0]?.source_type ?? "DEMO_ASSUMPTION"} />
          <span className="text-xs text-gray-400">
            정책 {snapshot.policy.policy_id} · v{scenario.policy_version}
          </span>

          {runId && (
            <Link
              href={`${base}/runs/${encodeURIComponent(runId)}/decisions`}
              className="ml-auto h-9 px-4 rounded-full bg-korail-blue text-white text-sm font-semibold flex items-center hover:bg-[#004080]"
            >
              결정 기록 →
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-[1180px] mx-auto px-6 py-8 flex flex-col gap-5">
        <div className="flex flex-wrap gap-4">
          {run ? (
            <>
              <StatCard value={assigned.length} label="배정" color="green" />
              <StatCard value={waiting.length} label="대기" color="amber" />
              <StatCard value={ineligible.length} label="불가" color="red" />
              <StatCard value={review.length} label="확인 필요" color="muted" />
            </>
          ) : (
            <>
              <StatCard value={rows.length} label="전체 주문" color="default" />
              <StatCard value={pending.length} label="적합" color="green" />
              <StatCard value={ineligible.length} label="부적합" color="red" />
              <StatCard value={review.length} label="확인 필요" color="muted" />
            </>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          <span className="text-xs text-gray-400">① 입력</span>
          {review.length === 0 ? (
            <span className="text-gray-500">주문 {rows.length}건 모두 유효</span>
          ) : (
            review.map((row) => {
              const missing = validationByOrder.get(row.orderId)?.missing_fields ?? [];
              return (
                <span key={row.orderId} className="text-gray-600">
                  <code className="font-mono font-medium text-gray-900">{row.orderId}</code>{" "}
                  {reasonLabel(row.primaryReasonCode)}
                  {missing.length > 0 && (
                    <>
                      {" · "}
                      <code className="text-xs text-amber-600">{missing.join(", ")}</code>
                    </>
                  )}
                </span>
              );
            })
          )}
          <span className="ml-auto text-xs text-gray-400">
            유효 {rows.length - review.length}건 · 추정으로 채우지 않습니다
          </span>
        </div>

        <Section
          title="② 타임라인"
          accent="blue"
          headerRight={
            <span className="text-xs text-gray-400">막대는 주문의 준비 → 납기 구간</span>
          }
        >
          <Timeline rows={timelineRows} markers={timelineMarkers} />
        </Section>

        <Section
          title={run ? "③ 기본 편성" : "③ 편성 전"}
          accent="green"
          headerRight={
            run ? (
              <code className="text-xs font-mono text-gray-400">{run.run_id}</code>
            ) : (
              <span className="text-xs text-gray-400">아직 실행되지 않았습니다</span>
            )
          }
        >
          <div
            className={`grid gap-5 ${selected ? "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]" : "grid-cols-1"}`}
          >
            <div className="flex flex-col gap-6">
              {snapshot.baseline_service_ids.map((serviceId) => {
                const service = idx.serviceById.get(serviceId);
                return (
                  <div key={serviceId} className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-baseline gap-2 text-sm">
                      <code className="font-mono font-bold text-gray-900">{serviceId}</code>
                      {service && (
                        <span className="text-gray-500">
                          {terminalName(idx, service.origin_terminal_id)} →{" "}
                          {terminalName(idx, service.destination_terminal_id)} · 반입 마감{" "}
                          <span className="text-gray-900">
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
                      assignments={run?.assignments ?? []}
                      highlightOrderId={selectedOrderId ?? null}
                    />
                  </div>
                );
              })}

              <div className="flex flex-col gap-5 pt-1">
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
                    { label: "입력", value: selected.inputState, tone: selected.inputState === "VALID" ? "ok" : "bad" },
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
                  ] satisfies PanelAxis[]
                }
                comparison={constraintComparison(idx, selected.comparable, selectedOrder)}
                note={selected.detail}
                sourceType={snapshot.assumptions[0]?.source_type ?? "DEMO_ASSUMPTION"}
                closeHref={withParams({})}
                action={
                  selected.assignmentState === "ASSIGNED" || selected.inputState !== "VALID"
                    ? null
                    : selectedAdjustments.length
                      ? { label: "대안 검토", href: withParams({ order: selected.orderId, alt: selected.orderId }) }
                      : { label: "승인된 변경 없음" }
                }
              />
            )}
          </div>
        </Section>

        {altOutcome?.found === false && (
          <Section title={`④ ${altOutcome.order_id} 대안 검토`} accent="amber">
            <Alert type="warning">
              <strong className="text-gray-900">
                허용 범위 안에 실행 가능한 대안이 없습니다.
              </strong>
              <br />
              사유 <code className="font-mono text-xs">{altOutcome.reason_code}</code> —{" "}
              {reasonLabel(altOutcome.reason_code)}
              {altOutcome.change_set.length > 0 && (
                <>
                  <br />
                  시도한 변경:{" "}
                  {altOutcome.change_set.map((c) => describeChange(c).text).join(", ")}
                </>
              )}
            </Alert>
          </Section>
        )}

        {altOutcome?.found === true && altView && altIdx && (
          <Section
            title={`④ ${altView.orderId} 대안`}
            accent="purple"
            headerRight={
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-gray-400">
                  {altOutcome.alternative_run_id}
                </code>
                <span className="text-xs text-gray-400">검증</span>
                <StatusBadge label={altView.validatorStatus} size="sm" />
              </div>
            }
          >
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {altOutcome.change_set.map((change, i) => {
                  const described = describeChange(change);
                  return (
                    <span key={i} className="flex items-center gap-2">
                      <span className="text-gray-900">{described.text}</span>
                      <code className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                        {described.code}
                      </code>
                    </span>
                  );
                })}
              </div>

              {altView.serviceId && altRun && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-baseline gap-2 text-sm">
                    <code className="font-mono font-bold text-gray-900">{altView.serviceId}</code>
                    <span className="text-gray-500">
                      반입 마감{" "}
                      <span className="text-gray-900">{formatTime(altView.cutoffAt)}</span> · 출발{" "}
                      {formatTime(altView.departureAt)} · 도착 {formatTime(altView.arrivalAt)}
                      {altView.destinationName && ` · 도착지 ${altView.destinationName}`}
                    </span>
                  </div>
                  <WagonDiagram
                    idx={altIdx}
                    serviceId={altView.serviceId}
                    assignments={altRun.assignments}
                    highlightOrderId={altView.orderId}
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                {altView.checks.map((check) => (
                  <CheckItem
                    key={check.label}
                    icon={check.icon}
                    label={check.label}
                    detail={check.detail}
                    status={check.status}
                  />
                ))}
              </div>

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
                    {altOutcome.assignment_deltas.map((delta) => (
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

              <p className="text-xs text-gray-400">
                파생 시나리오 <code className="font-mono">{altOutcome.alternative_scenario_id}</code>
                에서 다시 계산했습니다. 기본안은 그대로 남습니다.
              </p>
            </div>
          </Section>
        )}

        {run?.validator_findings && run.validator_findings.length > 0 && (
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

        <p className="text-xs text-gray-400">
          표시된 시각·규격·한도는 시나리오 스냅샷의 원본 값이며, 이 화면은 판정을 다시
          계산하지 않습니다. 모든 운영 수치는 DEMO_ASSUMPTION이고 실제 운행 가능성이나
          비용·탄소 절감을 주장하지 않습니다.
        </p>
      </main>
    </div>
  );
}
