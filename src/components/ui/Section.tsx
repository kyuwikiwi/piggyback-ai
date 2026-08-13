import type {ReactNode} from "react";

/**
 * Section — 좌측 액센트 바가 있는 카드 컨테이너
 *
 * 사용 예:
 *   <Section title="기본안 슬롯 배정" accent="green" headerRight={<StatusBadge label="OPTIMAL" />}>
 *     ...내용
 *   </Section>
 */

const accentMap ={
    green:  "bg-emerald-500",
    amber:  "bg-amber-500",
    red:    "bg-red-500",
    blue:   "bg-blue-600",
    purple: "bg-violet-500",
    cyan:   "bg-cyan-500",
    muted:  "bg-gray-400",
} as const;

type Accent= keyof typeof accentMap;

interface SectionProps{
    title?: string;
    accent?: Accent;
    headerRight?: ReactNode;
    children: ReactNode;
    className?: string;
}

export function Section({title, accent, headerRight, children, className= ""}: SectionProps){
    return (
        <div className={`rounded-xl border border-gray-200 bg-white overflow-hidden ${className}`}>
            {title &&(
                <div className= "flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-2.5">
                        {accent &&(
                            <div className={`w-1 h-5 rounded-sm ${accentMap[accent]}`} />

                        )}
                        <h3 className= "text-[15px] font-bold text-gray-900">{title}</h3>
                    </div>
                    {headerRight && <div>{headerRight}</div>}
                </div>
            )}
            <div className="p-6">{children}</div>
        </div>
    );
}