/**
 * CheckItem — 제약 하나가 어떤 값끼리 견줘서 통과했는지
 *
 * 예전에는 줄마다 ⏰ ⚖️ 📐 📅 🏭 🔍이 붙어 있었다. 그림이 말해 주는 건 이미
 * 라벨에 적혀 있고("반입 마감 통과"), 정작 읽어야 하는 건 오른쪽의 두 값이다.
 * 통과 여부는 부호 하나와 색으로 충분하다.
 */

const statusConfig = {
  pass: { symbol: "✓", ink: "text-ok", rule: "border-ok-line" },
  warn: { symbol: "!", ink: "text-warn", rule: "border-warn-line" },
  fail: { symbol: "✕", ink: "text-bad", rule: "border-bad-line" },
} as const;

type Status = keyof typeof statusConfig;

interface CheckItemProps {
  label: string;
  detail: string;
  status: Status;
  className?: string;
}

export function CheckItem({ label, detail, status, className = "" }: CheckItemProps) {
  const config = statusConfig[status];

  return (
    <div
      className={`flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-l-2 pl-3 py-1 ${config.rule} ${className}`}
    >
      <span className={`font-semibold text-[13px] ${config.ink}`} aria-hidden="true">
        {config.symbol}
      </span>
      <span className="text-sm font-medium text-ink">{label}</span>
      <span className="font-mono text-[13px] text-ink-3">{detail}</span>
    </div>
  );
}
