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

const toneStyles = {
  warning: {
    heading: "text-amber-600",
    // 왼쪽 액센트만 쓰는 줄이라 모서리는 각지게 둔다.
    row: "border-l-[3px] border-amber-400 bg-amber-50",
  },
  danger: {
    heading: "text-red-600",
    row: "border border-gray-200 rounded-lg bg-white",
  },
  muted: {
    heading: "text-gray-500",
    row: "rounded-lg bg-gray-50",
  },
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
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <span className={`text-xs font-semibold ${styles.heading}`}>{title}</span>
        <span className="text-xs text-gray-400">{entries.length}건</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {entries.map((entry) => {
          const body = (
            <>
              <code className="font-mono text-sm font-bold text-gray-900">{entry.orderId}</code>

              {entry.label && <StatusBadge label={entry.label} size="sm" />}
              {entry.badges.map((badge) => (
                <StatusBadge key={badge} label={badge} size="sm" />
              ))}

              {entry.comparison ? (
                <ConstraintCompare comparison={entry.comparison} />
              ) : (
                entry.note && <span className="text-xs text-gray-500">{entry.note}</span>
              )}
            </>
          );

          const shape = `px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 ${styles.row}`;

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
                entry.selected ? "ring-2 ring-korail-blue" : "hover:border-korail-light"
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
