import Link from "next/link";

import { CheckItem, Section } from "@/components/ui";
import { ScenarioChrome } from "../ScenarioChrome";
import { buildAlternativeChecks, describeChange, planDeltas } from "@/lib/view/alternatives";
import { formatTime } from "@/lib/view/format";
import { loadScenarioView } from "@/lib/view/scenario";
import { terminalName } from "@/lib/view/snapshot";
import { rebaselineScenario } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "계보" };

/**
 * 계보 — 이 시나리오가 어디서 왔고, 여기서 무엇이 갈라져 나갔나.
 *
 * 스냅샷이 불변이라 "값을 고친다"는 건 늘 파생본을 만드는 일이고, 그래서 이 제품은
 * 쓸수록 시나리오가 늘어난다. 기본안 대비 표와 기준 운행 바꾸기는 둘 다 그 나무를
 * 다루는 일인데 편성 화면 아래에 따로 떨어져 있었다 -- 하나는 표, 하나는 폼이라
 * 같은 질문의 두 면으로 보이지 않았다.
 */
export default async function LineageTab({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  const { scenarioId } = await params;
  const { run: runParam } = await searchParams;

  const view = await loadScenarioView(scenarioId, runParam);
  const { scenario, snapshot, idx, run, parentId, parent, parentRun, derived } = view;

  const deltas = parentRun && run ? planDeltas(parentRun, run) : [];
  const movedOrderId = deltas.find((d) => d.after !== null)?.orderId ?? null;

  return (
    <ScenarioChrome view={view} tab="lineage">
      <Section
        title="이 시나리오의 자리"
      >
        <div className="flex flex-col gap-2.5 text-sm">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="w-20 shrink-0 text-[13px] text-ink-3">기본안</span>
            {parentId ? (
              <Link
                href={`/scenarios/${encodeURIComponent(parentId)}`}
                className="font-mono text-korail-blue hover:underline"
              >
                {parentId}
              </Link>
            ) : (
              <span className="text-ink-2">없습니다 — 이 시나리오가 기본안입니다</span>
            )}
            {parentId && scenario.change_set.length > 0 && (
              <span className="text-ink">
                {scenario.change_set.map((c) => describeChange(c).text).join(", ")}
              </span>
            )}
            {parentId && scenario.change_set.length === 0 && parent && (
              <span className="text-ink-2">
                {parent.order_count === snapshot.orders.length
                  ? scenario.scenario_name
                  : `주문 ${snapshot.orders.length - parent.order_count > 0 ? "+" : ""}${
                      snapshot.orders.length - parent.order_count
                    }`}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="w-20 shrink-0 text-[13px] text-ink-3">파생</span>
            {derived.length === 0 ? (
              <span className="text-ink-2">아직 없습니다</span>
            ) : (
              derived.map((child) => (
                <Link
                  key={child.scenario_id}
                  href={`/scenarios/${encodeURIComponent(child.scenario_id)}`}
                  className="font-mono text-korail-blue hover:underline"
                >
                  {child.scenario_id}
                </Link>
              ))
            )}
          </div>
        </div>
      </Section>

      {parentId && run && (
        <Section
          title="기본안 대비"
          headerRight={
            <span className="text-[13px]">
              <code className="font-mono">{parentId}</code>의 편성과 비교
            </span>
          }
        >
          <div className="flex flex-col gap-4">
            {deltas.length === 0 ? (
              <p className="text-sm text-ink-2">배정이 달라진 주문이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[13px] text-ink-3 border-b border-line">
                      <th className="py-2.5 pr-3 font-medium">주문</th>
                      <th className="py-2.5 pr-3 font-medium">기본안</th>
                      <th className="py-2.5 font-medium">이 시나리오</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deltas.map((delta) => (
                      <tr key={delta.orderId} className="border-b border-line">
                        <td className="py-3 pr-3">
                          <code className="font-mono font-medium text-ink">{delta.orderId}</code>
                        </td>
                        <td className="py-3 pr-3 font-mono text-ink-2">
                          {delta.before
                            ? `${delta.before.service_id} · ${delta.before.slot_id}`
                            : "미배정"}
                        </td>
                        <td className="py-2 font-mono text-ink-2">
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
              <div className="flex flex-col gap-1">
                <span className="text-[13px] text-ink-3">
                  <code className="font-mono">{movedOrderId}</code> 배정 근거
                </span>
                {buildAlternativeChecks(
                  snapshot,
                  movedOrderId,
                  run.assignments.find((a) => a.order_id === movedOrderId) ?? null,
                  run.validator_status,
                ).map((check) => (
                  <CheckItem
                    key={check.label}
                    label={check.label}
                    detail={check.detail}
                    status={check.status}
                  />
                ))}
              </div>
            )}

          </div>
        </Section>
      )}

      {run && snapshot.services.length > snapshot.baseline_service_ids.length && (
        <Section title="기준 운행 바꿔 다시 편성">
          <form action={rebaselineScenario} className="flex flex-col gap-3">
            <input type="hidden" name="scenario_id" value={scenarioId} />
            <p className="text-sm text-ink-2 leading-6 max-w-[76ch]">
              고른 운행으로 같은 주문들을 다시 편성합니다.
            </p>

            <div className="flex flex-col gap-1">
              {snapshot.services.map((service) => (
                <label
                  key={service.service_id}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="service_ids"
                    value={service.service_id}
                    defaultChecked={snapshot.baseline_service_ids.includes(service.service_id)}
                    className="accent-korail-blue"
                  />
                  <code className="font-mono font-medium text-ink">{service.service_id}</code>
                  <span className="text-ink-2">
                    {terminalName(idx, service.origin_terminal_id)} →{" "}
                    {terminalName(idx, service.destination_terminal_id)} · 반입 마감{" "}
                    {formatTime(service.planning_cutoff_at)} · 도착{" "}
                    {formatTime(service.arrival_at)}
                  </span>
                </label>
              ))}
            </div>

            <button type="submit" className="btn self-start">
              이 운행들로 새 시나리오 편성
            </button>
          </form>
        </Section>
      )}
    </ScenarioChrome>
  );
}
