/**
 * ReasonRow — 사유 코드 + 메시지 표시
 *
 * 사용 예:
 *   <ReasonRow code="READY_AFTER_CUTOFF" message="준비 시각이 반입 마감 이후입니다." />
 *   <ReasonRow code="SLOT_WEIGHT_EXCEEDED" severity="error" message="..." />
 */

const severityStyles={
    warning:{
        container:"bg-amber-50 border-1-amber-500",
        code: "text-amber-600",
    },
    error: {
        container:"bg-red-50 border-1-red-500",
        code: "text-red-600",
    },
} as const;

type Severity= keyof typeof severityStyles;

interface ReasonRowProps{
    code: string;
    message: string;
    severity?: Severity;
    className?: string;
}

export function ReasonRow({ code, message, severity= "warning", className=""}: ReasonRowProps){
   const styles= severityStyles[severity] ;

   return (
    <div
        className={`flex items-start gap-3 rounded-log border-l-4 px-4 py-3 ${styles.container} ${className}`}
        >
            <code className={`shrink-0 mt-0.5 font-mono text-xs font-bold ${styles.code}`}>
                {code}
            </code>
            <span className="text-sm text-gray-600 leading-relaxed">{message}</span>
    </div>
   );
}