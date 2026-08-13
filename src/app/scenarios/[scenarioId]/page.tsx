import Link from "next/link";
import { redirect } from "next/navigation";

import {
  CANONICAL_SOLVER_PARAMETERS,
  createAlternative,
  createRun,
  createScenario,
  deleteScenario,
  getExplanation,
  getRun,
  getScenario,
  listScenarios,
  readValidation,
  validateScenario,
} from "@/lib/api";
import type { OrderOutcome, Run } from "@/lib/api";
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
import { buildAlternativeChecks, describeChange, planDeltas } from "@/lib/view/alternatives";
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
 * The run comes from the scenario when the URL does not name one, so every link
 * into a scenario is just `/scenarios/{id}` -- a list row, a parent, a derived
 * plan. `?order=` opens the detail beside it; searching for an alternative is a
 * POST, because it stores a new scenario and a new run.
 */

interface OrderRow {
  orderId: string;
  inputState: OrderOutcome["input_state"];
  eligibilityState: OrderOutcome["eligibility_state"];
  /** Null until a run exists -- there is no assignment to report yet. */
  assignmentState: OrderOutcome["assignment_state"] | null;
  alternativeState: OrderOutcome["alternative_state"] | null;
  alternativeScenarioId: string | null;
  primaryReasonCode: string | null;
  displayLabel: string | null;
  displayBadges: readonly string[];
  detail: string | null;
  eligibleSlotCount: number | null;
  comparable: ComparableOutcome | null;
}

export default async function ScenarioDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string }>;
  searchParams: Promise<{ run?: string; order?: string; altmiss?: string; altreason?: string }>;
}) {
  const { scenarioId } = await params;
  const {
    run: runParam,
    order: selectedOrderId,
    altmiss: alternativeMissFor,
    altreason: alternativeMissReason,
  } = await searchParams;

  const scenario = await getScenario(scenarioId);
  const runId = runParam ?? scenario.latest_run_id ?? null;

  // Read, never validate. `POST /validate` records a VALIDATION_COMPLETED
  // event, so a screen that validated on every render wrote a line into the
  // audit trail for every visit and the trail stopped describing what anyone
  // did. Null means the scenario was created and never validated -- a real
  // state this page answers with a button.
  const [validation, run, explanation, siblings] = await Promise.all([
    readValidation(scenarioId),
    runId ? getRun(runId) : Promise.resolve(null),
    runId ? getExplanation(runId) : Promise.resolve(null),
    listScenarios(100),
  ]);

  const idx = indexSnapshot(scenario.input_snapshot);
  const { snapshot } = idx;

  const parentId = scenario.parent_scenario_id ?? null;
  const derived = siblings.filter((s) => s.parent_scenario_id === scenarioId);

  // A derived plan is only meaningful against the one it came from, and the
  // parent's own run is where the comparison has to come from -- the response
  // that created this scenario is long gone by the time someone opens the link.
  const parent = parentId ? siblings.find((s) => s.scenario_id === parentId) ?? null : null;
  const parentRun: Run | null =
    parent?.latest_run_id ? await getRun(parent.latest_run_id) : null;
  const deltas = parentRun && run ? planDeltas(parentRun, run) : [];

  const validationByOrder = new Map((validation?.orders ?? []).map((o) => [o.order_id, o]));
  const outcomeByOrder = new Map((run?.order_outcomes ?? []).map((o) => [o.order_id, o]));
  const cardByOrder = new Map((explanation?.cards ?? []).map((c) => [c.order_id, c]));

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
      alternativeScenarioId: outcome?.alternative_scenario_id ?? null,
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
      eligibleSlotCount: validated?.eligible_slot_ids.length ?? null,
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
  const withOrder = (orderId?: string) =>
    orderId ? `${base}?order=${encodeURIComponent(orderId)}` : base;

  /**
   * Validate if needed, then solve.
   *
   * A scenario created and never solved had nothing on this page to solve it
   * with: the list showed it as `편성 전` and the link led to a dashboard whose
   * only action was adding another order. The solver parameters come from the
   * form so the reproducibility settings are visible and adjustable rather than
   * a constant nobody can see -- the service refuses anything but one worker,
   * which is worth being able to find out.
   */
  async function solve(formData: FormData) {
    "use server";

    if (!validation) await validateScenario(scenarioId);

    await createRun(scenarioId, {
      random_seed: Number(formData.get("random_seed") ?? CANONICAL_SOLVER_PARAMETERS.random_seed),
      // Pinned by the contract, and typed as the literal 1, so it is shown
      // beside the form rather than offered as a field. A screen that could
      // send 2 would only be able to demonstrate the service refusing it.
      num_search_workers: CANONICAL_SOLVER_PARAMETERS.num_search_workers,
      max_time_seconds: Number(
        formData.get("max_time_seconds") ?? CANONICAL_SOLVER_PARAMETERS.max_time_seconds,
      ),
    });

    // Outside any try/catch: redirect signals by throwing.
    redirect(base);
  }

  /**
   * Solve the same orders against a different set of baseline services.
   *
   * `baseline_service_ids` belongs to the scenario, not the run, so widening
   * the candidate set is a new snapshot rather than another solve -- which is
   * right: it is a different question, and the answer to the old one stays
   * where it was. Until now the only way to reach another service was one order
   * at a time through the alternative engine.
   */
  async function rebaseline(formData: FormData) {
    "use server";

    const chosen = formData.getAll("service_ids").map(String).filter(Boolean);
    if (chosen.length === 0) redirect(base);

    const created = await createScenario({
      scenario_name: `기준 운행 ${chosen.join(", ")}`,
      as_of: scenario.as_of,
      baseline_service_ids: chosen,
      policy_version: scenario.policy_version,
      assumption_ids: [...scenario.assumption_ids],
      input_snapshot: { ...snapshot, baseline_service_ids: chosen },
      parent_scenario_id: scenario.scenario_id,
    });

    await validateScenario(created.scenario_id);
    await createRun(created.scenario_id);

    redirect(`/scenarios/${encodeURIComponent(created.scenario_id)}`);
  }

  async function removeScenario() {
    "use server";

    await deleteScenario(scenarioId);
    redirect("/");
  }

  /**
   * Search the approved alternatives for one order.
   *
   * A form, not a link. It stores a derived scenario and a derived run, and
   * putting that behind a URL meant every refresh of that URL created another
   * one -- a prefetch could start a solve nobody asked for. On success the
   * derived scenario is a scenario like any other, so the redirect just opens
   * it; the plan and its lineage are drawn by this same page.
   */
  async function searchAlternative(formData: FormData) {
    "use server";

    const orderId = String(formData.get("order_id") ?? "");
    const forRunId = String(formData.get("run_id") ?? "");
    // Checkboxes, so the operator can ask about one approved change at a time.
    const adjustments = formData.getAll("adjustments").map(String).filter(Boolean);
    if (adjustments.length === 0) redirect(withOrder(orderId));

    const outcome = await createAlternative(forRunId, orderId, adjustments);


    // Outside any try/catch: redirect signals by throwing.
    redirect(
      outcome.found
        ? `/scenarios/${encodeURIComponent(outcome.alternative_scenario_id)}`
        : `${base}?order=${encodeURIComponent(orderId)}&altmiss=${encodeURIComponent(orderId)}` +
            `&altreason=${encodeURIComponent(outcome.reason_code)}`,
    );
  }

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
      detailHref: withOrder(row.orderId),
      selected: row.orderId === selectedOrderId,
    };
  }

  const selected = rows.find((r) => r.orderId === selectedOrderId) ?? null;
  const selectedOrder = selected ? idx.orderById.get(selected.orderId) : undefined;
  const selectedAdjustments = permittedAdjustments(selectedOrder);
  const movedOrderId = deltas.find((d) => d.after !== null)?.orderId ?? null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-200">
        <Header />
        <div className="max-w-[1180px] mx-auto px-6 py-5 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
              시나리오
            </Link>
            <span className="text-gray-300">/</span>
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

            <span className="ml-auto flex items-center gap-2">
              {/* Refused by the service while anything was derived from this
                  scenario, so the button is hidden rather than offered and
                  rejected. */}
              {derived.length === 0 && (
                <form action={removeScenario}>
                  <button
                    type="submit"
                    className="h-9 px-3 rounded-full border border-gray-200 text-sm text-gray-400 hover:border-red-300 hover:text-red-600"
                  >
                    삭제
                  </button>
                </form>
              )}
              <Link
                href={`${base}/orders/new`}
                className="h-9 px-4 rounded-full border border-gray-300 text-sm font-medium text-gray-700 flex items-center hover:border-korail-blue hover:text-korail-blue"
              >
                주문 추가
              </Link>
              {runId && (
                <Link
                  href={`${base}/runs/${encodeURIComponent(runId)}/decisions`}
                  className="h-9 px-4 rounded-full bg-korail-blue text-white text-sm font-semibold flex items-center hover:bg-[#004080]"
                >
                  결정 기록 →
                </Link>
              )}
            </span>
          </div>

          {(parentId || derived.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {parentId && (
                <>
                  <Link
                    href={`/scenarios/${encodeURIComponent(parentId)}`}
                    className="text-korail-blue hover:underline font-mono"
                  >
                    ← {parentId}
                  </Link>
                  <span>에서 파생</span>
                  {scenario.change_set.length > 0 ? (
                    scenario.change_set.map((change, i) => (
                      <span key={i} className="text-gray-900">
                        {describeChange(change).text}
                      </span>
                    ))
                  ) : parent && parent.order_count !== snapshot.orders.length ? (
                    // An approved adjustment names itself; a snapshot assembled
                    // by the order form does not, so say what actually differs.
                    <span className="text-gray-900">
                      주문 {snapshot.orders.length - parent.order_count > 0 ? "+" : ""}
                      {snapshot.orders.length - parent.order_count}
                    </span>
                  ) : null}
                </>
              )}
              {derived.length > 0 && (
                <span className="flex flex-wrap items-center gap-2">
                  {parentId && <span className="text-gray-300">|</span>}
                  <span>파생 {derived.length}건</span>
                  {derived.map((child) => (
                    <Link
                      key={child.scenario_id}
                      href={`/scenarios/${encodeURIComponent(child.scenario_id)}`}
                      className="font-mono text-korail-blue hover:underline"
                    >
                      {child.scenario_id}
                    </Link>
                  ))}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[1180px] mx-auto px-6 py-8 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
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
          {/* Four numbers that add up to something the reader should not have to
              add up. */}
          <p className="text-xs text-gray-400">
            주문 {rows.length}건 · 기준 운행{" "}
            <code className="font-mono">
              {snapshot.baseline_service_ids.join(", ")}
            </code>{" "}
            · 가용 슬롯 {capacity}개
          </p>
        </div>

        {alternativeMissFor && (
          <Alert type="warning">
            <strong className="text-gray-900">
              {alternativeMissFor} — 허용 범위 안에 실행 가능한 대안이 없습니다.
            </strong>
            {alternativeMissReason && (
              <>
                <br />
                사유 <code className="font-mono text-xs">{alternativeMissReason}</code> —{" "}
                {reasonLabel(alternativeMissReason)}
              </>
            )}
          </Alert>
        )}

        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          <span className="text-xs text-gray-400">① 입력</span>
          {!validation ? (
            <span className="text-gray-500">아직 검증하지 않았습니다</span>
          ) : review.length === 0 ? (
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

        {!run && (
          <Section title="③ 편성" accent="green" headerRight={<span className="text-xs text-gray-400">아직 실행되지 않았습니다</span>}>
            <form action={solve} className="flex flex-col gap-4">
              <p className="text-sm text-gray-500">
                {validation
                  ? "검증은 끝났습니다. 편성을 실행하세요."
                  : "입력을 검증한 뒤 편성을 실행합니다."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl">
                {(
                  [
                    ["random_seed", "seed", CANONICAL_SOLVER_PARAMETERS.random_seed, 0],
                    ["max_time_seconds", "제한 (초)", CANONICAL_SOLVER_PARAMETERS.max_time_seconds, 1],
                  ] as const
                ).map(([name, label, value, min]) => (
                  <label key={name} className="flex flex-col gap-1.5 text-sm">
                    <span className="text-gray-500">{label}</span>
                    <input
                      type="number"
                      name={name}
                      min={min}
                      defaultValue={value}
                      className="h-10 rounded-lg border border-gray-300 px-3 text-gray-900"
                    />
                  </label>
                ))}
                <div className="flex flex-col gap-1.5 text-sm">
                  <span className="text-gray-500">worker</span>
                  <div className="h-10 rounded-lg bg-gray-100 px-3 flex items-center font-mono text-gray-500">
                    {CANONICAL_SOLVER_PARAMETERS.num_search_workers}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="self-start h-11 px-6 rounded-full bg-korail-blue text-white text-sm font-semibold hover:bg-[#004080]"
              >
                편성 실행
              </button>

              <p className="text-xs text-gray-400">
                재현성은 이 세 값에 걸려 있습니다. worker는 계약이 1로 고정합니다 — 그 이상이면
                동점 처리와 해시가 달라져 같은 입력이 같은 결과를 내지 않습니다. seed와 시간
                제한을 바꾸면 결과 해시도 달라지므로, 정본 기대값과 대조하려면 기본값으로
                실행하세요.
              </p>
            </form>
          </Section>
        )}

        {run && (
        <Section
          title="③ 편성"
          accent="green"
          headerRight={<code className="text-xs font-mono text-gray-400">{run.run_id}</code>}
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
                      highlightOrderId={selectedOrderId ?? movedOrderId}
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
                    {
                      label: "후보 슬롯",
                      value: selected.eligibleSlotCount === null ? "—" : `${selected.eligibleSlotCount}개`,
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
                        runId,
                        adjustments: selectedAdjustments,
                        label: "대안 검토",
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

        {run && snapshot.services.length > snapshot.baseline_service_ids.length && (
          <Section title="기준 운행 바꿔 다시 편성" accent="cyan">
            <form action={rebaseline} className="flex flex-col gap-4">
              <p className="text-sm text-gray-500">
                후보에 넣을 운행을 고르면 같은 주문들로 새 시나리오를 편성합니다. 대안 엔진은
                주문 하나씩 다루지만, 이건 열차 단위 질문입니다.
              </p>

              <div className="flex flex-col gap-2">
                {snapshot.services.map((service) => (
                  <label key={service.service_id} className="flex flex-wrap items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="service_ids"
                      value={service.service_id}
                      defaultChecked={snapshot.baseline_service_ids.includes(service.service_id)}
                      className="accent-korail-blue"
                    />
                    <code className="font-mono font-medium text-gray-900">
                      {service.service_id}
                    </code>
                    <span className="text-gray-500">
                      {terminalName(idx, service.origin_terminal_id)} →{" "}
                      {terminalName(idx, service.destination_terminal_id)} · 반입 마감{" "}
                      {formatTime(service.planning_cutoff_at)} · 도착{" "}
                      {formatTime(service.arrival_at)}
                    </span>
                  </label>
                ))}
              </div>

              <button
                type="submit"
                className="self-start h-10 px-5 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:border-korail-blue hover:text-korail-blue"
              >
                이 운행들로 새 시나리오 편성
              </button>
            </form>
          </Section>
        )}

        {parentId && run && (
          <Section
            title="④ 기본안 대비"
            accent="purple"
            headerRight={
              <span className="text-xs text-gray-400">
                <code className="font-mono">{parentId}</code>의 편성과 비교
              </span>
            }
          >
            <div className="flex flex-col gap-5">
              {deltas.length === 0 ? (
                <p className="text-sm text-gray-500">배정이 달라진 주문이 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 border-b border-gray-200">
                        <th className="py-2 pr-3 font-medium">주문</th>
                        <th className="py-2 pr-3 font-medium">기본안</th>
                        <th className="py-2 font-medium">이 시나리오</th>
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

              {movedOrderId && (
                <div className="flex flex-col gap-2">
                  {buildAlternativeChecks(
                    snapshot,
                    movedOrderId,
                    run.assignments.find((a) => a.order_id === movedOrderId) ?? null,
                    run.validator_status,
                  ).map((check) => (
                    <CheckItem
                      key={check.label}
                      icon={check.icon}
                      label={check.label}
                      detail={check.detail}
                      status={check.status}
                    />
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-400">
                이 시나리오는 파생본이며, <code className="font-mono">{parentId}</code>는 그대로
                남아 있습니다.
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
