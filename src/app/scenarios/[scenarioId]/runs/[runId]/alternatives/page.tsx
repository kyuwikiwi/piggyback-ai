//장면4- 대안 비교

"use client";

import { useState } from "react";
import { altDetails, altNoResult, comparisonRows } from "@/lib/fixtures";
import { Header, StatusBadge, Section, CheckItem, Alert, SceneNav } from "@/components/ui";
import type { AltDetail } from "@/lib/fixtures";

const altTargets = ["ORD-005", "ORD-008"] as const;

export default function AlternativesPage() {
  const [selected, setSelected] = useState<string>("ORD-005");
  const detail: AltDetail | undefined = altDetails[selected];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header>
        <Header />
        <div className="bg-white px-6 pt-6 pb-4">
          <div className="max-w-[1060px] mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">대안 비교</h1>
            <p className="text-sm text-gray-500 mt-1">ORD-005 다음 운행, ORD-008 대체 터미널의 change_set</p>
          </div>
        </div>
        <SceneNav />
      </header>

      <main className="max-w-[1060px] mx-auto px-6 py-8 flex flex-col gap-5">
        <Section title="대안 가능 주문" accent="purple">
          <div className="grid grid-cols-2 gap-3">
            {altTargets.map((id) => {
              const isSelected = id === selected;
              const d = altDetails[id];
              return (
                <button key={id} onClick={() => setSelected(id)} className={`text-left rounded-xl p-4 border-2 transition-colors ${
                  isSelected ? "bg-violet-50 border-violet-300" : "bg-white border-gray-200 hover:border-gray-300 cursor-pointer"
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <code className="font-mono text-sm font-extrabold">{id}</code>
                    <StatusBadge label="조건부 대안 있음" size="sm" />
                  </div>
                  <div className="text-xs text-gray-500">{d.altService}</div>
                  <div className="text-[10px] text-violet-600 font-semibold mt-1">{d.changeType}</div>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="대안 불가 주문" accent="red">
          <div className="flex flex-col gap-2">
            {altNoResult.map((nr) => (
              <div key={nr.orderId} className="flex items-center gap-4 px-5 py-3 rounded-lg border border-red-200 bg-red-50">
                <code className="font-mono text-sm font-extrabold text-gray-900 w-20 shrink-0">{nr.orderId}</code>
                <StatusBadge label="불가" size="sm" />
                <span className="text-sm text-gray-500 flex-1">{nr.reason}</span>
              </div>
            ))}
          </div>
        </Section>

        {detail && (
          <div className="grid grid-cols-2 gap-5">
            <Section title={`${detail.orderId} 기본안 → 대안`} accent="purple">
              <div className="mb-5">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">기본안 탈락 사유</div>
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <code className="font-mono text-xs font-bold text-red-600">{detail.baseFail}</code>
                  <div className="text-sm text-gray-600 mt-1.5">{detail.baseDesc}</div>
                </div>
              </div>
              <div className="mb-5">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">적용된 변경</div>
                <div className="rounded-lg bg-violet-50 border border-violet-200 p-4">
                  <div className="text-sm font-bold text-violet-700 mb-1.5">→ {detail.altService}</div>
                  {detail.altTerminal && <div className="text-sm text-violet-600 mb-1.5">도착: {detail.altTerminal}</div>}
                  <div className="text-sm text-gray-500 leading-7">출발 {detail.altDepart} · 도착 {detail.altArrive}<br />반입 마감 {detail.altCutoff}</div>
                  <div className="mt-2"><code className="text-[10px] font-mono text-violet-500 bg-violet-100 px-2 py-0.5 rounded">{detail.changeType}</code></div>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">납기 여유 변화</div>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm font-bold text-red-600">{detail.slackBefore}</div>
                  <span className="text-lg text-gray-400">→</span>
                  <div className={`rounded-lg px-4 py-2 text-sm font-bold border ${
                    detail.slackWarn ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-emerald-50 border-emerald-200 text-emerald-600"
                  }`}>{detail.slackAfter}</div>
                </div>
              </div>
            </Section>

            <Section title="대안 적합성 상세 검증" accent="green">
              <div className="flex flex-col gap-2">
                {detail.checks.map((c, i) => (
                  <CheckItem key={i} icon={c.icon} label={c.label} detail={c.detail} status={c.status} />
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-4">
                <div className="text-sm font-bold text-emerald-600 mb-1">✓ 모든 하드 제약 통과</div>
                <div className="text-xs text-gray-500">
                  {detail.altService}에서 {detail.orderId}의 배정이 가능합니다.
                  {detail.slackWarn && " 단, 납기 여유가 없으므로 지연 위험에 유의하세요."}
                </div>
              </div>
            </Section>
          </div>
        )}

        <Section title="기본안 vs 대안 비교" accent="blue">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                {["항목", "기본안", "대안", "변경"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-3 font-semibold text-gray-900">{row.item}</td>
                  <td className="px-3 py-3 text-gray-500">{row.base}</td>
                  <td className="px-3 py-3 font-semibold text-violet-700">{row.alt}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${
                      row.diff.startsWith("+") ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : row.diff.startsWith("−") ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                      : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}>{row.diff}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Alert type="info">
          <strong className="text-gray-900">핵심</strong> — 대안은 승인된 변경만 새 시나리오에서 계산하며, 원안을 덮어쓰지 않습니다.
        </Alert>
      </main>

      <footer className="max-w-[1060px] mx-auto px-6 py-4 flex justify-between text-xs text-gray-400">
        <span>데모 가정 데이터 · 실제 운영 승인 기준이 아닙니다</span>
        <span>DEMO_POLICY_V1 · 2026-08-13</span>
      </footer>
    </div>
  );
}