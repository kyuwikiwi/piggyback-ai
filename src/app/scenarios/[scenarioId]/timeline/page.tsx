import Link from "next/link";

import { Section, Timeline } from "@/components/ui";
import { ScenarioChrome } from "../ScenarioChrome";
import type { TimelineGroup, TimelineRow, TimelineTone } from "@/components/ui";
import { formatTime } from "@/lib/view/format";
import { isTimeReason, reasonLabel } from "@/lib/view/reasons";
import { loadScenarioView, type OrderRow } from "@/lib/view/scenario";
import { terminalName } from "@/lib/view/snapshot";

export const dynamic = "force-dynamic";

export const metadata = { title: "타임라인" };

/**
 * 타임라인 — 시간 때문에 걸린 건과 아닌 건.
 *
 * 편성 화면에 끼어 있을 때는 세로로 350px을 쓰면서도 축이 좁아 마커 라벨이 서로
 * 겹쳤다. 이 도메인은 거의 전부가 시간이니 축 하나에 화면을 다 주는 편이 낫다 --
 * 그리고 시간이 원인이 *아닌* 탈락을 따로 세워 두면, 축을 아무리 봐도 답이
 * 나오지 않는 주문이 어느 것인지가 분명해진다.
 */
export default async function TimelineTab({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  const { scenarioId } = await params;
  const { run: runParam } = await searchParams;

  const view = await loadScenarioView(scenarioId, runParam);
  const { snapshot, idx, rows, ineligible } = view;

  const base = `/scenarios/${encodeURIComponent(scenarioId)}`;

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
          ? `시각 무관 · ${reasonLabel(row.primaryReasonCode)}`
          : null,
    };
  });

  // 운행이 하나뿐이면 왼쪽 열을 비운다 -- 줄이 하나인데 이름을 붙일 이유가 없다.
  const named = snapshot.baseline_service_ids.length > 1;
  const timelineGroups: TimelineGroup[] = snapshot.baseline_service_ids.flatMap((id) => {
    const service = idx.serviceById.get(id);
    if (!service) return [];
    return [
      {
        id: named ? id : null,
        markers: [
          { label: "반입 마감", at: service.planning_cutoff_at, hard: true },
          { label: "출발", at: service.departure_at },
          { label: "도착", at: service.arrival_at },
        ],
      },
    ];
  });

  // 축이 설명하지 못하는 탈락. 규격이나 터미널 취급처럼 시각을 옮겨도 달라지지
  // 않는 것들이라, 시간축을 들여다보는 사람에게 먼저 알려 줘야 한다.
  const notTime = ineligible.filter((row) => !isTimeReason(row.primaryReasonCode));

  return (
    <ScenarioChrome view={view} tab="timeline">
      <Section
        title="주문 기간과 운행 시각"
      >
        <Timeline rows={timelineRows} groups={timelineGroups} />
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="기준 운행의 시각" subdued>
          <dl className="flex flex-col gap-1.5 text-sm">
            {snapshot.baseline_service_ids.map((serviceId) => {
              const service = idx.serviceById.get(serviceId);
              if (!service) return null;
              return (
                <div key={serviceId} className="flex flex-wrap items-baseline gap-x-2">
                  <dt className="font-mono font-semibold text-ink">{serviceId}</dt>
                  <dd className="text-ink-2">
                    {terminalName(idx, service.origin_terminal_id)} →{" "}
                    {terminalName(idx, service.destination_terminal_id)} · 반입 마감{" "}
                    <span className="font-medium text-bad">
                      {formatTime(service.planning_cutoff_at)}
                    </span>{" "}
                    · 출발 {formatTime(service.departure_at)} · 도착{" "}
                    {formatTime(service.arrival_at)}
                  </dd>
                </div>
              );
            })}
          </dl>
        </Section>

        <Section
          title="시각과 무관한 불가"
          subdued
          headerRight={<span className="text-[13px] tabular-nums">{notTime.length}건</span>}
        >
          {notTime.length === 0 ? (
            <p className="text-sm text-ink-2">
              모두 시각 때문입니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {notTime.map((row) => (
                <li key={row.orderId}>
                  <Link
                    href={`${base}?order=${encodeURIComponent(row.orderId)}`}
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm rounded-md px-2 py-1 -mx-2 hover:bg-white"
                  >
                    <code className="font-mono font-semibold text-ink">{row.orderId}</code>
                    <span className="text-bad">{reasonLabel(row.primaryReasonCode)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </ScenarioChrome>
  );
}
