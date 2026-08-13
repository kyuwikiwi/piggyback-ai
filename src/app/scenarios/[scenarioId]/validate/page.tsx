// 입력 검증

"use client";

import { orders, services, terminalNames, validationReport } from "@/lib/fixtures";
import { Header, StatusBadge, StatCard, Section, ReasonRow, Alert, SourceBadge, SceneNav } from "@/components/ui";

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function ValidatePage() {
  const report = validationReport;
  const issueOrderIds = new Set(report.issues.map((i) => i.order_id));

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header>
        <Header />
        <div className="bg-white px-6 pt-6 pb-4">
          <div className="max-w-[1060px] mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">입력·검증</h1>
            <p className="text-sm text-gray-500 mt-1">ORD-006 누락 필드와 격리</p>
          </div>
        </div>
        <SceneNav />
      </header>

      <main className="max-w-[1060px] mx-auto px-6 py-8 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">시나리오</span>
          <code className="text-sm font-bold text-[#00afd5] font-mono">SCN-DEMO-001</code>
          <span className="ml-auto text-xs text-gray-400">정책 DEMO_POLICY_V1</span>
        </div>

        <Section title="입력 검증 결과" accent="blue">
          <div className="flex gap-4 mb-5">
            <StatCard value={report.valid_count} label="유효" color="green" />
            <StatCard value={report.review_required_count} label="확인 필요" color="amber" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  {["주문", "출발 → 도착", "준비", "납기", "중량", "높이", "우선순위", "태그", "출처", "검증"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const hasIssue = issueOrderIds.has(o.order_id);
                  const weightNull = o.gross_weight_kg === null;
                  const heightOver = o.dimensions_mm.height_mm > 4000;
                  return (
                    <tr key={o.order_id} className={`border-b border-gray-100 ${hasIssue ? "bg-amber-50" : ""}`}>
                      <td className="px-3 py-3 font-mono font-bold text-sm text-gray-900">{o.order_id}</td>
                      <td className="px-3 py-3 text-gray-500">{terminalNames[o.origin_terminal_ids[0]]} → {terminalNames[o.destination_terminal_ids[0]]}</td>
                      <td className="px-3 py-3 text-gray-500">{o.ready_at ? formatTime(o.ready_at) : "⚠ 누락"}</td>
                      <td className="px-3 py-3 text-gray-500">{formatTime(o.due_at)}</td>
                      <td className={`px-3 py-3 ${weightNull ? "text-amber-600 font-bold" : "text-gray-500"}`}>{weightNull ? "⚠ 누락" : `${o.gross_weight_kg! / 1000}t`}</td>
                      <td className={`px-3 py-3 ${heightOver ? "text-red-600 font-bold" : "text-gray-500"}`}>{o.dimensions_mm.height_mm}mm</td>
                      <td className="px-3 py-3"><StatusBadge label={o.priority_class} size="sm" /></td>
                      <td className="px-3 py-3"><span className="text-[10px] text-gray-400 font-mono">{o.compatibility_tags[0]}</span></td>
                      <td className="px-3 py-3"><SourceBadge type={o.source_ref.source_type} /></td>
                      <td className="px-3 py-3">
                        {hasIssue ? <StatusBadge label="확인 필요" size="sm" /> : <span className="text-emerald-600 font-bold text-xs">✓ 유효</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {report.issues.map((issue) => (
          <ReasonRow key={`${issue.order_id}-${issue.code}`} code={issue.code} message={`${issue.order_id}: ${issue.message}`} />
        ))}

        <Alert type="info">
          <strong className="text-gray-900">핵심</strong> — 모르는 값은 임의로 채우지 않고 계산에서 분리합니다.
        </Alert>
      </main>

      <footer className="max-w-[1060px] mx-auto px-6 py-4 flex justify-between text-xs text-gray-400">
        <span>데모 가정 데이터 · 실제 운영 승인 기준이 아닙니다</span>
        <span>DEMO_POLICY_V1 · 2026-08-13</span>
      </footer>
    </div>
  );
}