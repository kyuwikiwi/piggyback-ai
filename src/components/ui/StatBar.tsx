/**
 * StatBar — 한 줄짜리 요약
 *
 * 예전에는 이 자리에 카드 네 장이 떠 있었고, 그 안에 36px 숫자가 들어 있었다.
 * 세는 대상이 아홉 건인 화면에서 `3`을 그 크기로 그리면 눈에 먼저 들어오는 게
 * 숫자의 크기지 숫자끼리의 차이가 아니고, 결정 화면에서는 아예 `OPTIMAL`이라는
 * 문자열이 그 자리에 들어가 있었다 — 셀 수 없는 값을 KPI로 그린 것이다.
 *
 * 그래서 한 줄로 눕히고 크기를 낮췄다. 숫자는 서로 비교되라고 있는 것이라
 * 자릿수를 고정하고, 색은 판정을 나타낼 때만 쓴다.
 */

const toneStyles = {
  ok: "text-ok",
  warn: "text-warn",
  bad: "text-bad",
  neutral: "text-ink",
  muted: "text-ink-3",
} as const;

export type StatTone = keyof typeof toneStyles;

export interface Stat {
  label: string;
  value: number | string;
  tone?: StatTone;
  /** 열거값처럼 세지 않는 값. 크게 그리지 않고 코드로 그린다. */
  code?: boolean;
}

export function StatBar({ stats, className = "" }: { stats: readonly Stat[]; className?: string }) {
  return (
    // 내용만큼만 차지한다. 폭을 다 쓰면 한 자리 숫자 옆에 300px씩 빈 칸이 남아,
    // 요약이 아니라 늘려 놓은 배너처럼 보인다.
    <div
      className={`inline-flex flex-wrap w-fit max-w-full panel divide-x divide-line ${className}`}
    >
      {/* 390px에서 네 칸이 한 줄에 들어가도록. 92px이면 세 칸에서 줄이 바뀌고,
          남은 한 칸이 아래로 떨어지면서 첫 줄 오른쪽에 빈 칸이 생겼다. */}
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-[84px] px-4 sm:px-5 py-3">
          <div className="text-[13px] text-ink-3">{stat.label}</div>
          <div
            className={`mt-0.5 ${toneStyles[stat.tone ?? "neutral"]} ${
              stat.code
                ? "font-mono text-[15px] font-semibold leading-8"
                : "text-2xl font-semibold tabular-nums leading-8"
            }`}
          >
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
