"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SceneNavProps {
  scenarioId: string;
  /** Null until a run exists. The last three scenes are run-scoped. */
  runId?: string | null;
}

interface Scene {
  label: string;
  icon: string;
  path: string;
  needsRun: boolean;
}

function scenesFor(scenarioId: string, runId: string | null): Scene[] {
  const scenario = `/scenarios/${encodeURIComponent(scenarioId)}`;
  const run = runId ? `${scenario}/runs/${encodeURIComponent(runId)}` : null;
  return [
    { label: "대시보드", icon: "📊", path: scenario, needsRun: false },
    { label: "입력·검증", icon: "📋", path: `${scenario}/validate`, needsRun: false },
    { label: "후보 검토", icon: "🔍", path: `${scenario}/eligibility`, needsRun: false },
    { label: "기본 편성", icon: "🚆", path: run ?? "", needsRun: true },
    { label: "대안 비교", icon: "🔄", path: run ? `${run}/alternatives` : "", needsRun: true },
    { label: "결정 기록", icon: "✅", path: run ? `${run}/decisions` : "", needsRun: true },
  ];
}

export function SceneNav({ scenarioId, runId = null }: SceneNavProps) {
  const pathname = usePathname();
  const scenes = scenesFor(scenarioId, runId);

  // The scenario-scoped scenes carry the run in the query so the nav stays
  // whole after leaving a run page; pathname never includes it.
  const runQuery = runId ? `?run=${encodeURIComponent(runId)}` : "";

  return (
    <nav className="bg-white border-b border-gray-200 px-6">
      <div className="max-w-[1060px] mx-auto flex overflow-x-auto">
        {scenes.map((s) => {
          const isActive = pathname === s.path;
          const className = `flex-1 min-w-[110px] text-center px-4 py-4 border-b-[3px] transition-colors ${
            isActive
              ? "border-korail-blue"
              : "border-transparent hover:border-korail-light/50"
          }`;
          const label = (
            <>
              <div className="text-xl mb-1">{s.icon}</div>
              <div
                className={`text-sm ${
                  isActive ? "font-bold text-korail-blue" : "font-medium text-gray-400"
                }`}
              >
                {s.label}
              </div>
            </>
          );

          if (s.needsRun && !runId) {
            return (
              <span
                key={s.label}
                title="편성을 실행하면 열립니다"
                className={`${className} opacity-40 cursor-not-allowed`}
              >
                {label}
              </span>
            );
          }

          return (
            <Link
              key={s.label}
              href={s.needsRun ? s.path : `${s.path}${runQuery}`}
              className={className}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
