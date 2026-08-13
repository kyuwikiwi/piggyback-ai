"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const scenes = [
  { label: "대시보드", icon: "📊", href: "/scenarios/demo" },
  { label: "입력·검증", icon: "📋", href: "/scenarios/demo/validate" },
  { label: "후보 검토", icon: "🔍", href: "/scenarios/demo/eligibility" },
  { label: "기본 편성", icon: "🚆", href: "/scenarios/demo/runs/001" },
  { label: "대안 비교", icon: "🔄", href: "/scenarios/demo/runs/001/alternatives" },
  { label: "결정 기록", icon: "✅", href: "/scenarios/demo/runs/001/decisions" },
];

export function SceneNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 px-6">
      <div className="max-w-[1060px] mx-auto flex overflow-x-auto">
        {scenes.map((s) => {
          const isActive = pathname === s.href;
          return (
            <Link
              key={s.href}
              href={s.href}
              className={`flex-1 min-w-[110px] text-center px-4 py-4 border-b-[3px] transition-colors ${
                isActive
                  ? "border-korail-blue"
                  : "border-transparent hover:border-korail-light/50"
              }`}
            >
              <div className="text-xl mb-1">{s.icon}</div>
              <div className={`text-sm ${
                isActive ? "font-bold text-korail-blue" : "font-medium text-gray-400"
              }`}>
                {s.label}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}