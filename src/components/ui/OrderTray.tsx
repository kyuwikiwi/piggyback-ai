import Link from "next/link";

import type { ConstraintComparison } from "@/lib/view/constraints";
import { ConstraintCompare } from "./ConstraintCompare";
import { StatusBadge } from "./StatusBadge";

/**
 * OrderTray — 배정되지 않은 주문을 성격별로 나눠 놓는 구역
 *
 * 화면이 이 제품에서 증명해야 하는 건 하나다: **자리만 없는 주문**과 **조건이
 * 안 되는 주문**은 다르다. 같은 목록에 배지 글자만 바꿔 늘어놓으면 그 구분은
 * 읽는 사람 몫이 되고, 대개 안 읽힌다. 그래서 구역을 나눈다 — 위치가 곧 의미다.
 *
 * 어느 구역에 놓을지는 서비스가 내려준 상태축을 읽어서 정한다. 이 컴포넌트는
 * 분류만 하고 판정하지 않는다.
 */

/**
 * 구역의 색은 왼쪽 선 하나로만 말한다. 예전에는 대기 구역이 통째로 노란 판이었고
 * 불가 구역은 흰 카드였는데, 배경 전체를 칠하면 그 안의 배지와 초과 표시가 같은
 * 색조에 묻힌다 — 정작 읽어야 하는 건 줄 안쪽의 두 값이다.
 */
const toneStyles = {
  warning: { heading: "text-warn", row: "border-l-[3px] border-warn-line bg-warn-bg/50 rounded-r-md" },
  danger: { heading: "text-bad", row: "border-l-[3px] border-bad-line bg-bad-bg/50 rounded-r-md" },
  muted: { heading: "text-ink-3", row: "border-l-[3px] border-line-strong bg-sunken rounded-r-md" },
} as const;

export type TrayTone = keyof typeof toneStyles;

export interface TrayEntry {
  orderId: string;
  /** 서비스가 계산한 표시 라벨. 화면이 만들지 않는다. */
  label: string | null;
  badges: readonly string[];
  comparison: ConstraintComparison | null;
  /** 비교로 표현되지 않는 사유의 설명. 서비스의 문장을 그대로 쓴다. */
  note: string | null;
  /** 상세 패널을 여는 주소. 줄 전체가 링크가 된다. */
  detailHref: string | null;
  /** 지금 패널에 열려 있는 주문. */
  selected?: boolean;
  /** 생성형 레이어가 이 주문에 대해 제안을 냈다. 문장은 AI 탭과 패널에 있다. */
  suggested?: boolean;
}

export function OrderTray({
  tone,
  title,
  entries,
}: {
  tone: TrayTone;
  title: string;
  entries: readonly TrayEntry[];
}) {
  if (entries.length === 0) return null;

  const styles = toneStyles[tone];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <span className={`text-[13px] font-semibold ${styles.heading}`}>{title}</span>
        <span className="text-[13px] text-ink-3 tabular-nums">{entries.length}건</span>
      </div>

      <div className="flex flex-col gap-1">
        {entries.map((entry) => {
          const body = (
            <>
              <code className="font-mono text-sm font-semibold text-ink">
                {entry.orderId}
              </code>

              {entry.label && <StatusBadge label={entry.label} size="sm" />}
              {entry.badges.map((badge) => (
                <StatusBadge key={badge} label={badge} size="sm" />
              ))}

              {entry.comparison ? (
                <ConstraintCompare comparison={entry.comparison} />
              ) : (
                entry.note && <span className="text-[13px] text-ink-2">{entry.note}</span>
              )}

              {/* 제안이 있다는 사실만. 문장까지 여기 늘어놓으면 줄이 두 배가 되고,
                  이 목록이 답해야 하는 건 "무엇이 안 실렸나"지 "무엇을 해보자"가
                  아니다. */}
              {entry.suggested && (
                <span className="ml-auto text-[13px] text-korail-blue whitespace-nowrap">
                  제안 있음
                </span>
              )}
            </>
          );

          const shape = `px-3.5 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 ${styles.row}`;

          if (!entry.detailHref) {
            return (
              <div key={entry.orderId} className={shape}>
                {body}
              </div>
            );
          }

          return (
            <Link
              key={entry.orderId}
              href={entry.detailHref}
              className={`${shape} transition-colors ${
                entry.selected
                  ? "outline outline-korail-blue -outline-offset-1"
                  : "hover:bg-white"
              }`}
            >
              {body}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
