import { Fragment } from "react";

import { formatTime } from "@/lib/view/format";

/**
 * Timeline — 주문의 준비~납기 구간을 운행의 시각 위에 겹쳐 놓는다
 *
 * 이 도메인은 거의 전부가 시간이다. 반입 마감, 출발, 도착, 주문의 준비와 납기가
 * 표 셀 안의 문자열로 흩어져 있으면, `반입 마감 초과`가 30분인지 6시간인지 알려면
 * 사람이 두 칸을 찾아 빼야 한다. 축 위에 올려두면 뺄 필요가 없다.
 *
 * 판정은 하지 않는다. 막대의 색은 서비스가 준 상태축을 그대로 옮긴 것이고, 시간이
 * 원인이 아닌 탈락은 그렇게 밝힌다.
 *
 * 마커는 운행별로 줄을 나눈다. 한 줄에 다 놓으면 운행이 둘일 때 여섯 개가 몰리고,
 * 어느 마감이 어느 열차 것인지 구분하려고 라벨마다 `SVC-AM-01` 접두어를 붙이면서
 * 길이가 두 배가 돼 서로 겹쳤다. 운행 id는 왼쪽 열로 빠지고 라벨은 짧아진다.
 *
 * 좁은 화면에서는 축 위에 떠 있던 마커 라벨과 막대 옆 주석을 축 밖으로 내린다.
 * 375px에서 트랙은 250px 남짓인데 `반입 마감 10:30` 하나가 60px라, 세 개가 서로
 * 겹치고 카드 밖으로 밀려났다. 선은 그대로 두고 값만 옮긴다.
 */

const HOUR = 3_600_000;

/**
 * 같은 줄에 이웃한 라벨이 이만큼은 떨어져 있어야 한다(트랙 폭의 %).
 *
 * 서버에서 그리므로 트랙의 픽셀 폭도 글자 폭도 알 수 없다. 폭이 600px일 때
 * `반입 마감 10:30`이 대략 90px이니 15%면 안전하고, 더 넓어지면 여유가 는다.
 * 못 넣은 마커는 그 운행의 둘째 줄로 내린다.
 */
const MIN_GAP_PCT = 15;

const barTone = {
  assigned: "bg-ok-bg border-ok/45",
  waiting: "bg-warn-bg border-warn/45",
  ineligible: "bg-bad-bg border-bad/40",
  review: "bg-white border-line-strong border-dashed",
  // Eligible, but no run has placed it yet -- a scenario can be read back
  // before it is solved, and neutral is the only honest colour then.
  pending: "bg-sunken border-line-strong",
} as const;

const labelTone = {
  assigned: "text-ink-2",
  waiting: "text-warn",
  ineligible: "text-bad",
  review: "text-ink-3",
  pending: "text-ink-3",
} as const;

export type TimelineTone = keyof typeof barTone;

export interface TimelineRow {
  orderId: string;
  readyAt: string;
  dueAt: string;
  tone: TimelineTone;
  /** 시간축이 설명하지 못하는 탈락 사유. 있으면 막대 옆에 적는다. */
  aside: string | null;
}

export interface TimelineMarker {
  /** 접두어 없는 짧은 이름. 어느 운행인지는 줄이 말한다. */
  label: string;
  at: string;
  /** 마감처럼 넘으면 곧바로 탈락인 선. 나머지는 참고선이다. */
  hard?: boolean;
}

export interface TimelineGroup {
  /** 운행 id. 운행이 하나뿐이면 null이라 왼쪽 열을 비운다. */
  id: string | null;
  markers: readonly TimelineMarker[];
}

/** Label column and the overlay that has to start where the track does. */
// 운행 id가 들어가는 열이라 주문 id보다 넓어야 한다 -- `SVC-NEXT-01`이 74px에서
// 잘렸다.
const LABEL_COLUMN = "grid-cols-[54px_minmax(0,1fr)] sm:grid-cols-[88px_minmax(0,1fr)]";
const TRACK_INSET = "left-[54px] sm:left-[88px]";

/** 겹치지 않게 라벨을 줄로 나눈다. 왼쪽부터 채우고, 못 들어가면 아랫줄. */
function stagger(placed: readonly { at: number }[]): number[] {
  const lastPerRow: number[] = [];
  return placed.map(({ at }) => {
    const row = lastPerRow.findIndex((last) => at - last >= MIN_GAP_PCT);
    if (row === -1) {
      lastPerRow.push(at);
      return lastPerRow.length - 1;
    }
    lastPerRow[row] = at;
    return row;
  });
}

export function Timeline({
  rows,
  groups,
}: {
  rows: readonly TimelineRow[];
  groups: readonly TimelineGroup[];
}) {
  if (rows.length === 0) return null;

  const allMarkers = groups.flatMap((group) => group.markers);

  const instants = [
    ...rows.flatMap((row) => [Date.parse(row.readyAt), Date.parse(row.dueAt)]),
    ...allMarkers.map((marker) => Date.parse(marker.at)),
  ].filter((t) => Number.isFinite(t));

  if (instants.length === 0) return null;

  const start = Math.min(...instants);
  const end = Math.max(...instants);
  const span = end - start;

  // A zero span would divide by zero below. It also means there is nothing to
  // lay out: one instant is a point, not an axis.
  if (span <= 0) return null;

  const pct = (at: number) => ((at - start) / span) * 100;

  const firstTick = Math.ceil(start / HOUR) * HOUR;
  const step = span > 12 * HOUR ? 3 * HOUR : 2 * HOUR;
  const ticks: number[] = [];
  for (let t = firstTick; t <= end; t += step) ticks.push(t);

  const asides = rows.filter((row) => row.aside);

  // Positions are needed twice -- once to place the label, once to draw the
  // line -- and sorting matters for the stagger.
  const laid = groups.map((group) => {
    const marks = group.markers
      .map((marker) => ({ marker, at: pct(Date.parse(marker.at)) }))
      .filter((m) => Number.isFinite(m.at))
      .sort((a, b) => a.at - b.at);
    return { group, marks, rowOf: stagger(marks) };
  });

  return (
    <div>
      {/* 좁은 화면: 축 위에 못 올리는 값들을 운행별로 한 줄씩. */}
      <div className="flex flex-col gap-1 mb-3 text-[13px] sm:hidden">
        {laid.map(({ group, marks }, i) => (
          <div key={group.id ?? i} className="flex flex-wrap items-baseline gap-x-2">
            {group.id && (
              <code className="font-mono text-[11px] font-medium text-ink">{group.id}</code>
            )}
            {marks.map(({ marker }) => (
              <span key={marker.label} className={marker.hard ? "text-bad" : "text-ink-3"}>
                {marker.label} {formatTime(marker.at)}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* 마커 라벨. 트랙 밖으로 새어 나가지 않게 여기서 잘라 둔다. */}
      <div className={`hidden sm:grid overflow-hidden mb-1 ${LABEL_COLUMN}`}>
        {laid.map(({ group, marks, rowOf }, i) => {
          const height = (Math.max(...rowOf, 0) + 1) * 18;
          return (
            <Fragment key={group.id ?? i}>
              <code className="font-mono text-[11px] text-ink-2 pr-2 truncate leading-[18px]">
                {group.id}
              </code>
              <div className="relative" style={{ height }}>
                {marks.map(({ marker, at }, k) => {
                  // A label pinned near the right edge would run off the track.
                  const flip = at > 82;
                  return (
                    <span
                      key={marker.label}
                      className={`absolute text-[11px] whitespace-nowrap leading-[18px] ${
                        marker.hard ? "text-bad" : "text-ink-3"
                      }`}
                      style={{
                        top: rowOf[k] * 18,
                        ...(flip ? { right: `${100 - at}%` } : { left: `${at}%` }),
                        ...(flip ? { marginRight: 4 } : { marginLeft: 4 }),
                      }}
                    >
                      {marker.label} {formatTime(marker.at)}
                    </span>
                  );
                })}
              </div>
            </Fragment>
          );
        })}
      </div>

      {/* Nothing may escape the card: the asides sit outside the track by
          design. */}
      <div className="relative overflow-hidden">
        <div
          className={`absolute inset-y-0 right-0 pointer-events-none ${TRACK_INSET}`}
          aria-hidden="true"
        >
          {laid.flatMap(({ group, marks }, i) =>
            marks.map(({ marker, at }) => (
              <div
                key={`${group.id ?? i}-${marker.label}`}
                className={`absolute inset-y-0 w-px ${
                  marker.hard ? "bg-bad/40" : "bg-line-strong"
                }`}
                style={{ left: `${at}%` }}
              />
            )),
          )}
        </div>

        <div className={`grid gap-y-1.5 items-center ${LABEL_COLUMN}`}>
          {rows.map((row) => {
            const from = pct(Date.parse(row.readyAt));
            const to = pct(Date.parse(row.dueAt));
            return (
              <div key={row.orderId} className="contents">
                <code className={`font-mono text-[11px] ${labelTone[row.tone]}`}>
                  {row.orderId}
                </code>
                <div className="relative h-3.5">
                  <div
                    className={`absolute inset-y-0 rounded-sm border ${barTone[row.tone]}`}
                    style={{ left: `${from}%`, width: `${Math.max(to - from, 0.6)}%` }}
                    title={`${formatTime(row.readyAt)} – ${formatTime(row.dueAt)}`}
                  />
                  {row.aside && (
                    <span
                      className="hidden sm:inline absolute top-0 text-[11px] text-ink-3 whitespace-nowrap"
                      style={to > 82 ? { right: 0, top: -14 } : { left: `calc(${to}% + 6px)` }}
                    >
                      {row.aside}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`grid mt-2 ${LABEL_COLUMN}`}>
        <span />
        <div className="relative h-4">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute top-0 text-[11px] text-ink-3 tabular-nums -translate-x-1/2"
              style={{ left: `${pct(tick)}%` }}
            >
              {formatTime(new Date(tick).toISOString())}
            </span>
          ))}
        </div>
      </div>

      {asides.length > 0 && (
        <div className="flex flex-col gap-0.5 mt-3 text-[11px] text-ink-3 sm:hidden">
          {asides.map((row) => (
            <span key={row.orderId}>
              <code className="font-mono">{row.orderId}</code> {row.aside}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
