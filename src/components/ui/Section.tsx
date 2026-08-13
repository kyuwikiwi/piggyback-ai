import type { ReactNode } from "react";

/**
 * Section — 한 덩어리의 화면을 담는 판
 *
 * 예전에는 제목 옆에 색 막대가 붙었고, 그 색은 초록·파랑·보라·청록을 돌아가며
 * 썼다. 어느 색도 뜻이 없었다 — 이 앱에서 색이 뜻하는 건 판정 세 가지뿐인데,
 * 장식이 같은 어휘를 쓰면 진짜 신호가 묻힌다. 막대를 빼고 제목만 남겼다.
 *
 * `step`은 작업 순서다. ①②③ 대신 숫자를 그대로 쓴다.
 * `subdued`는 흰 판 없이 그리는 판 — 모든 블록이 같은 카드였을 때 "결과에 묻기"가
 * 편성 전체와 같은 무게로 보이던 문제를 여기서 나눈다.
 */
export interface SectionProps {
  title?: string;
  /** 작업 순서의 몇 번째인지. 제목 앞에 작게 붙는다. */
  step?: number;
  headerRight?: ReactNode;
  children: ReactNode;
  /** 부차적인 블록. 흰 판과 테두리 없이 캔버스 위에 그린다. */
  subdued?: boolean;
  className?: string;
}

export function Section({
  title,
  step,
  headerRight,
  children,
  subdued = false,
  className = "",
}: SectionProps) {
  const shell = subdued
    ? "border-t border-line pt-4"
    : "panel";

  return (
    <section className={`${shell} ${className}`}>
      {title && (
        <div
          className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 ${
            subdued ? "pb-3" : "px-6 pt-5 pb-4 border-b border-line"
          }`}
        >
          <h2 className="flex items-baseline gap-2">
            {step !== undefined && (
              <span className="font-mono text-[13px] text-ink-3 tabular-nums">
                {String(step).padStart(2, "0")}
              </span>
            )}
            <span
              className={`font-semibold text-ink ${subdued ? "text-sm" : "text-[15px]"}`}
            >
              {title}
            </span>
          </h2>
          {headerRight && <div className="text-ink-3">{headerRight}</div>}
        </div>
      )}
      <div className={subdued ? "" : "p-6"}>{children}</div>
    </section>
  );
}
