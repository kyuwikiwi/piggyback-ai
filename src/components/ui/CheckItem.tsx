/**
 * CheckItem — 제약 조건 검증 결과 아이템
 *
 * 사용 예:
 *   <CheckItem icon="⏰" label="반입 마감 통과" detail="준비 08:30 → 마감 11:30" status="pass" />
 *   <CheckItem icon="📅" label="납기 충족" detail="도착 18:00 = 납기 18:00" status="warn" />
 */

const statusConfig= {
    pass:{
        container:"bg-emerald-50 border-emerald-200",
        indicator:"text-emerald-600",
        symbol:"✓",
    },
    warn:{
        container:"bg-amber-50 border-amber-200",
        indicator:"text-amber-600",
        symbol:"△",
    },
    fail:{
        container: "bg-red-50 border-red-200",
        indicator:"text-red-600",
        symbol:"✗",
    },
}as const;

type Status= keyof typeof statusConfig;

interface CheckItemProps{
    icon: string;
    label: string;
    detail: string;
    status: Status;
    className?: string;
}

export function CheckItem({icon, label, detail, status, className=""}: CheckItemProps){
    const config= statusConfig[status];

    return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${config.container} ${className}`}
    >
      <span className="shrink-0 text-xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-gray-900">{label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{detail}</div>
      </div>
      <span className={`shrink-0 text-lg font-extrabold ${config.indicator}`}>
        {config.symbol}
      </span>
    </div>
  );
}