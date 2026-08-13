//장면1- 대시보드

"use client";

import { orders, services, wagons, slots, terminals, terminalNames } from "@/lib/fixtures";
import { Header, StatusBadge, StatCard, Section, Alert, SceneNav, SourceBadge } from "@/components/ui";

export default function DashboardPage() {
  const validOrders = orders.filter((o) => o.gross_weight_kg !== null);
  const reviewOrders = orders.filter((o) => o.gross_weight_kg === null);
  const availableSlots = slots.filter((s) => s.available);
  const baselineService = services.find((s) => s.service_id === "SVC-AM-01")!;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header>
        <Header />
        <div className="bg-white px-6 pt-6 pb-4">
          <div className="max-w-[1060px] mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
            <p className="text-sm text-gray-500 mt-1">시나리오 요약과 데이터 출처를 확인합니다</p>
          </div>
        </div>
        <SceneNav />
      </header>

      <main className="max-w-[1060px] mx-auto px-6 py-8 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">시나리오</span>
          <code className="text-sm font-bold text-[#00afd5] font-mono">SCN-DEMO-001</code>
          <SourceBadge type="DEMO_ASSUMPTION" />
          <span className="ml-auto text-xs text-gray-400">정책 DEMO_POLICY_V1</span>
        </div>

        <div className="flex gap-4">
          <StatCard value={orders.length} label="전체 주문" color="default" />
          <StatCard value={validOrders.length} label="유효 주문" color="green" />
          <StatCard value={reviewOrders.length} label="확인 필요" color="amber" />
          <StatCard value={services.length} label="운행" color="blue" />
          <StatCard value={availableSlots.length} label="가용 슬롯" color="purple" />
        </div>

        <Section title="운행 현황" accent="blue">
          <div className="grid grid-cols-3 gap-4">
            {services.map((svc) => {
              const isBaseline = svc.service_id === "SVC-AM-01";
              const svcWagons = wagons.filter((w) => w.service_id === svc.service_id);
              const svcSlots = slots.filter((s) => svcWagons.some((w) => w.wagon_id === s.wagon_id));
              const availSlots = svcSlots.filter((s) => s.available);
              return (
                <div key={svc.service_id} className="rounded-xl border border-gray-200 p-5">
                  <div className="flex justify-between items-center mb-3">
                    <code className="text-sm font-bold font-mono text-gray-900">{svc.service_id}</code>
                    <StatusBadge label={isBaseline ? "기준 운행" : "대안 운행"} size="sm" />
                  </div>
                  <div className="text-sm text-gray-500 leading-7">
                    {terminalNames[svc.origin_terminal_id]} → {terminalNames[svc.destination_terminal_id]}
                    <br />화차 {svcWagons.length}량 · 슬롯 {availSlots.length}/{svcSlots.length}개
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="터미널 현황" accent="green">
          <div className="grid grid-cols-3 gap-4">
            {terminals.map((t) => (
              <div key={t.terminal_id} className="rounded-xl border border-gray-200 p-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-gray-900">{terminalNames[t.terminal_id]}</span>
                  <code className="text-xs font-mono text-gray-400">{t.terminal_id}</code>
                </div>
                <div className="text-sm text-gray-500 leading-7">
                  운영 {t.operating_windows[0].open_time}~{t.operating_windows[0].close_time}
                  <br />처리시간 {t.minimum_handling_minutes}분 · {t.intake_cutoff_rule}
                </div>
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {t.supported_tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Alert type="info">
          <strong className="text-gray-900">데모 가정</strong> — 모든 운영 수치와 좌표는 DEMO_ASSUMPTION입니다. 실제 운행 가능성, 비용·탄소 절감을 주장하지 않습니다.
        </Alert>
      </main>

      <footer className="max-w-[1060px] mx-auto px-6 py-4 flex justify-between text-xs text-gray-400">
        <span>데모 가정 데이터 · 실제 운영 승인 기준이 아닙니다</span>
        <span>DEMO_POLICY_V1 · 2026-08-13</span>
      </footer>
    </div>
  );
}