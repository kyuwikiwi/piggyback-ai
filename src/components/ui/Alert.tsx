import type {ReactNode} from "react";

/**
 * Alert — 핵심 메시지 / 경고 / 에러 박스
 *
 * 사용 예:
 *   <Alert type="info">
 *     <strong>핵심</strong> — 시스템은 모르는 값을 임의로 채우지 않습니다.
 *   </Alert>
 */

const typeStyles={
    info:{
        container:"bg-blue-50 border-blue-200",
        icon: "💡",
    },
    warning:{
        container:"bg-amber-50 border-amber-200",
        icon: "⚠️",
    },
    error:{
        container:"bg-red-50 border-red-200",
        icon:"x",
    },
} as const;

type AlertType= keyof typeof typeStyles;

interface AlertProps{
    type?: AlertType;
    children: ReactNode;
    className?: string;
}

export function Alert({type="info", children, className=""}: AlertProps){
    const styles= typeStyles[type];

    return (
        <div
            className={`flex items-start gap-3 rounded-xl border px-5 py-4 text-sm text-gray-600 leading-relaxed ${styles.container} ${className}`}
            >
            <span className="shrink-0 mt-0.5 text-lg">{styles.icon}</span>
            <div>{children}</div>
        </div>
    );
}