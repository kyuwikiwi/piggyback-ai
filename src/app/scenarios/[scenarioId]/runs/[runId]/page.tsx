//장면3- 기본 편성

"use client";

import { orders, slots, wagons, solverRun, orderOutcomes } from "@/lib/fixtures";
import { Header, StatusBadge, StatCard, Section, Alert, SceneNav } from "@/components/ui";

export default function RunPage() {
  const assigned = orderOutcomes.filter((o) => o.assignment_state === "ASSIGNED");
  const unassigned = orderOutcomes.filter((o) => o.assignment_state !== "ASSIGNED");
  const capacityConflict = unassigned.filter((o) => o.primary_reason_code === "CAPACITY_CONFLICT");
  const ineligible = unassigned.filter((o) => o.eligibility_state === "INELIGIBLE");
  const review = unassigned.filter((o) => o.input_state === "REVIEW_REQUIRED");

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header>
        <Header />
        <div className="bg-white px-6 pt-6 pb-4">
          <div className="max-w-[1060px] mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">기본 편성</h1>
            <p className="text-sm text-gray-500 mt-1">3개 배정, 화차 배치도, ORD-004 경합</p>
          </div>
        </div>
        <SceneNav />
      </header>

      <main className="max-w-[1060px] mx-auto px-6 py-8 flex flex-col gap-5">
        <div className="flex gap-4">
          <StatCard value={assigned.length} label="배정 완료" color="green" />
          <StatCard value={capacityConflict.length} label="슬롯 경합" color="cyan" />
          <StatCard value={ineligible.length} label="부적합" color="red" />
          <StatCard value={review.length} label="확인 필요" color="amber" />
        </div>

        <Section title="기본안 슬롯 배정" accent="green" headerRight={
          <div className="flex items-center gap-2">
            <code className="text-xs text-gray-400 font-mono">{solverRun.run_id}</code>
            <StatusBadge label="OPTIMAL" size="sm" />
          </div>
        }>
          <div className="grid grid-cols-2 gap-4">
            {wagons.filter((w) => w.service_id === "SVC-AM-01").map((wgn) => {
              const wgnSlots = slots.filter((s) => s.wagon_id === wgn.wagon_id);
              return (
                <div key={wgn.wagon_id}>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{wgn.wagon_id}</div>
                  <div className="flex gap-3">
                    {wgnSlots.map((slot) => {
                      const asgn = solverRun.assignments.find((a) => a.slot_id === slot.slot_id);
                      const order = asgn ? orders.find((o) => o.order_id === asgn.order_id) : null;
                      return (
                        <div key={slot.slot_id} className={`flex-1 rounded-xl p-4 text-center border-2 ${
                          !slot.available ? "bg-gray-100 border-gray-300 opacity-50"
                          : asgn ? "bg-emerald-50 border-emerald-200"
                          : "bg-gray-50 border-gray-200"
                        }`}>
                          <div className="text-[11px] text-gray-400 mb-1.5">{slot.slot_id}</div>
                          {!slot.available ? (
                            <div className="text-sm text-gray-400">사용 불가</div>
                          ) : asgn && order ? (
                            <>
                              <div className="text-lg font-extrabold text-emerald-600">{asgn.order_id}</div>
                              <div className="text-sm text-gray-500 mt-1">{order.gross_weight_kg! / 1000}t</div>
                            </>
                          ) : (
                            <div className="text-sm text-gray-400">빈 슬롯</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="미배정 주문" accent="amber">
          <div className="flex flex-col gap-2.5">
            {unassigned.map((o) => (
              <div key={o.order_id} className="flex items-center gap-4 px-5 py-3.5 rounded-lg border border-gray-200 bg-gray-50">
                <code className="font-mono text-sm font-extrabold text-gray-900 w-20 shrink-0">{o.order_id}</code>
                <StatusBadge label={o.display_label} />
                {o.display_badges.map((badge) => (
                  <StatusBadge key={badge} label={badge} size="sm" />
                ))}
                <span className="text-sm text-gray-500 flex-1">{o.reason_details[0]?.message ?? ""}</span>
              </div>
            ))}
          </div>
        </Section>

        <Alert type="info">
          <strong className="text-gray-900">핵심</strong> — 미배정은 불가와 다릅니다. ORD-004는 용량 경합입니다.
        </Alert>
      </main>

      <footer className="max-w-[1060px] mx-auto px-6 py-4 flex justify-between text-xs text-gray-400">
        <span>데모 가정 데이터 · 실제 운영 승인 기준이 아닙니다</span>
        <span>DEMO_POLICY_V1 · 2026-08-13</span>
      </footer>
    </div>
  );
}