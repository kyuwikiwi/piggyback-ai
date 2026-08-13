import type { ReactNode } from "react";

/**
 * Alert — 핵심 메시지 / 경고 / 에러
 *
 * 이모지를 뗐다. 💡와 ⚠️가 붙어 있었고 에러에는 소문자 `x`가 붙어 있었는데 —
 * 세 개가 서로 다른 그림 체계였다. 화면의 다른 어디에도 그림은 없으니 이것들만
 * 튀었고, 정작 급한 건 빨간 테두리지 그 옆의 그림이 아니다. 왼쪽 굵은 선이
 * 종류를 말하게 두고 글자를 읽게 한다.
 */

const typeStyles = {
  info: "border-l-korail-blue bg-white",
  warning: "border-l-warn bg-warn-bg border-warn-line",
  error: "border-l-bad bg-bad-bg border-bad-line",
} as const;

type AlertType = keyof typeof typeStyles;

interface AlertProps {
  type?: AlertType;
  children: ReactNode;
  className?: string;
}

export function Alert({ type = "info", children, className = "" }: AlertProps) {
  return (
    <div
      className={`rounded-r-lg border border-l-[3px] border-line px-4 py-3 text-sm leading-6 text-ink-2 ${typeStyles[type]} ${className}`}
    >
      {children}
    </div>
  );
}
