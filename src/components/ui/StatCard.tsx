/**
 * StatCard — 숫자 KPI 표시
 *
 * 사용 예:
 *   <StatCard value={4} label="배정 완료" color="green" />
 *   <StatCard value={1} label="불가" color="red" />
 */

const colorMap={
    green:  "text-emerald-600",
    amber:  "text-amber-600",
    red:    "text-red-600",
    blue:   "text-blue-600",
    purple: "text-violet-600",
    cyan:   "text-cyan-600",
    muted:  "text-gray-500",
    default: "text-gray-900",
} as const;

type Color= keyof typeof colorMap;

interface StatCardProps{
    value: number | string;
    label: string;
    color?: Color;
    className?: string;
}

export function StatCard({ value, label, color= "default", className= ""}: StatCardProps){
    return (
        <div className={`flex-1 min-w-[90px] rounded-xl border border-gray-200 bg-white p-4 text-center ${className}`}>
            <div className= {`text-4xl font-extrabold leading-none ${colorMap[color]}`}>
                {value}
            </div>
            <div className= "mt-2 text-sm font-medium text-gray-500">
                {label}
            </div>
        </div>
    );
}