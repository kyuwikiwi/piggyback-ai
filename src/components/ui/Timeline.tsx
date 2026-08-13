import { formatTime } from "@/lib/view/format";

/**
 * Timeline — 주문의 준비~납기 구간을 운행의 시각 위에 겹쳐 놓는다
 *
 * 이 도메인은 거의 전부가 시간이다. 반입 마감, 출발, 도착, 주문의 준비와 납기가
 * 표 셀 안의 문자열로 흩어져 있으면, `반입 마감 초과`가 30분인지 6시간인지 알려면
 * 사람이 두 칸을 찾아 빼야 한다. 축 위에 올려두면 뺄 필요가 없다.
 *
 * 판정은 하지 않는다. 막대의 색은 서비스가 준 상태축을 그대로 옮긴 것이고, 시간이
 * 원인이 아닌 탈락은 `aside`로 그렇게 밝힌다.
 */

const LABEL_WIDTH = 74;
const HOUR = 3_600_000;

const barTone = {
  assigned: "bg-emerald-100 border-emerald-400",
  waiting: "bg-amber-100 border-amber-400",
  ineligible: "bg-red-100 border-red-400",
  review: "bg-white border-gray-300 border-dashed",
  // Eligible, but no run has placed it yet -- a scenario can be read back
  // before it is solved, and neutral is the only honest colour then.
  pending: "bg-gray-100 border-gray-300",
} as const;

const labelTone = {
  assigned: "text-gray-500",
  waiting: "text-amber-600",
  ineligible: "text-red-600",
  review: "text-gray-400",
  pending: "text-gray-500",
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
  label: string;
  at: string;
  /** 마감처럼 넘으면 곧바로 탈락인 선. 나머지는 참고선이다. */
  hard?: boolean;
}

export function Timeline({
  rows,
  markers,
}: {
  rows: readonly TimelineRow[];
  markers: readonly TimelineMarker[];
}) {
  if (rows.length === 0) return null;

  const instants = [
    ...rows.flatMap((row) => [Date.parse(row.readyAt), Date.parse(row.dueAt)]),
    ...markers.map((marker) => Date.parse(marker.at)),
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

  return (
    <div>
      <div className="relative">
        <div
          className="absolute inset-y-0 right-0 pointer-events-none"
          style={{ left: LABEL_WIDTH }}
          aria-hidden="true"
        >
          {markers.map((marker) => {
            const at = pct(Date.parse(marker.at));
            // A label pinned near the right edge would run off the track.
            const flip = at > 82;
            return (
              <div key={marker.label} className="absolute inset-y-0" style={{ left: `${at}%` }}>
                <div
                  className={`absolute top-[18px] bottom-0 w-px ${
                    marker.hard ? "bg-red-300" : "bg-gray-300"
                  }`}
                />
                <div
                  className={`absolute top-0 text-[11px] whitespace-nowrap ${
                    marker.hard ? "text-red-600" : "text-gray-500"
                  }`}
                  style={flip ? { right: 4 } : { left: 4 }}
                >
                  {marker.label} {formatTime(marker.at)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-[22px]" />

        <div
          className="grid gap-y-1.5 items-center"
          style={{ gridTemplateColumns: `${LABEL_WIDTH}px minmax(0, 1fr)` }}
        >
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
                      className="absolute top-0 text-[11px] text-gray-400 whitespace-nowrap"
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

      <div
        className="grid mt-2"
        style={{ gridTemplateColumns: `${LABEL_WIDTH}px minmax(0, 1fr)` }}
      >
        <span />
        <div className="relative h-4">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute top-0 text-[11px] text-gray-400 -translate-x-1/2"
              style={{ left: `${pct(tick)}%` }}
            >
              {formatTime(new Date(tick).toISOString())}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
