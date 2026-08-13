//장면2- 후보 검토


"use client";

import { orders, orderOutcomes } from "@/lib/fixtures";
import { Header, StatusBadge, StatCard, Section, ReasonRow, Alert, SceneNav } from "@/components/ui";

export default function EligibilityPage() {
  const eligible = orderOutcomes.filter((o) => o.eligibility_state === "ELIGIBLE");
  const ineligible = orderOutcomes.filter((o) => o.eligibility_state === "INELIGIBLE");
  const notEval = orderOutcomes.filter((o) => o.eligibility_state === "NOT_EVALUATED");

  const rows = orderOutcomes.map((oc) => {
    const order = orders.find((o) => o.order_id === oc.order_id)!;
    return { ...oc, order };
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header>
        <Header />
        <div className="bg-white px-6 pt-6 pb-4">
          <div className="max-w-[1060px] mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">후보 검토</h1>
            <p className="text-sm text-gray-500 mt-1">ORD-007 높이, ORD-008 터미널 사유 확인</p>
          </div>
        </div>
        <SceneNav />
      </header>

      <main className="max-w-[1060px] mx-auto px-6 py-8 flex flex-col gap-5">
        <div className="flex gap-4">
          <StatCard value={eligible.length} label="적합 (ELIGIBLE)" color="green" />
          <StatCard value={ineligible.length} label="부적합 (INELIGIBLE)" color="red" />
          <StatCard value={notEval.length} label="확인 필요" color="amber" />
        </div>

        <Section title="SVC-AM-01 기준 적합성 판정" accent="green">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                {["주문", "우선순위", "중량", "높이", "판정", "사유"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.order_id} className="border-b border-gray-100">
                  <td className="px-3 py-3 font-mono font-bold text-sm text-gray-900">{r.order_id}</td>
                  <td className="px-3 py-3"><StatusBadge label={r.order.priority_class} size="sm" /></td>
                  <td className={`px-3 py-3 ${r.order.gross_weight_kg === null ? "text-amber-600 font-bold" : "text-gray-500"}`}>
                    {r.order.gross_weight_kg !== null ? `${r.order.gross_weight_kg / 1000}t` : "누락"}
                  </td>
                  <td className={`px-3 py-3 ${r.order.dimensions_mm.height_mm > 4000 ? "text-red-600 font-bold" : "text-gray-500"}`}>
                    {r.order.dimensions_mm.height_mm}mm
                  </td>
                  <td className="px-3 py-3">
                    {r.eligibility_state === "ELIGIBLE" && <span className="text-emerald-600 font-bold">✓ ELIGIBLE</span>}
                    {r.eligibility_state === "INELIGIBLE" && <span className="text-red-600 font-bold">✗ INELIGIBLE</span>}
                    {r.eligibility_state === "NOT_EVALUATED" && <span className="text-amber-600 font-bold">? 미평가</span>}
                  </td>
                  <td className="px-3 py-3">
                    {r.primary_reason_code && (
                      <code className={`font-mono text-xs font-semibold px-2 py-1 rounded-md ${
                        r.primary_reason_code === "MISSING_REQUIRED_FIELD" ? "bg-amber-50 text-amber-600"
                        : "bg-red-50 text-red-600"
                      }`}>{r.primary_reason_code}</code>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <div className="grid grid-cols-2 gap-3">
          <ReasonRow code="READY_AFTER_CUTOFF" message="ORD-005 — 준비 시각 11:00이 반입 마감 10:30 이후" />
          <ReasonRow code="TUNNEL_HEIGHT_EXCEEDED" severity="error" message="ORD-007 — 높이 4,300mm가 경로 한도 4,000mm 초과" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ReasonRow code="TERMINAL_NOT_COMPATIBLE" severity="error" message="ORD-008 — 도착 터미널 TRM-B에서 취급 불가" />
          <ReasonRow code="DUE_TIME_EXCEEDED" severity="error" message="ORD-009 — 납기 15:00, 가장 빠른 도착 16:00" />
        </div>

        <Alert type="info">
          <strong className="text-gray-900">핵심</strong> — 추천보다 시간·규격·중량·터미널 하드 제약을 먼저 확인합니다.
        </Alert>
      </main>

      <footer className="max-w-[1060px] mx-auto px-6 py-4 flex justify-between text-xs text-gray-400">
        <span>데모 가정 데이터 · 실제 운영 승인 기준이 아닙니다</span>
        <span>DEMO_POLICY_V1 · 2026-08-13</span>
      </footer>
    </div>
  );
}