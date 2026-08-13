import { getScenario, validateScenario } from "@/lib/api";
import {
  Alert,
  Header,
  ReasonRow,
  SceneNav,
  Section,
  SourceBadge,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { formatMm, formatTime, formatTonnes } from "@/lib/view/format";
import { reasonLabel } from "@/lib/view/reasons";
import { baselineHeightLimitMm, indexSnapshot, terminalName } from "@/lib/view/snapshot";

export const dynamic = "force-dynamic";

export default async function ValidatePage({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  const { scenarioId } = await params;
  const { run: runId } = await searchParams;

  // Validation is a POST because it recomputes and stores the result; there is
  // no GET for it outside the export bundle, which needs a solved run. It is
  // deterministic over an immutable snapshot, so re-running it on a revisit
  // produces the same answer -- this screen *is* the validation step.
  const [scenario, validation] = await Promise.all([
    getScenario(scenarioId),
    validateScenario(scenarioId),
  ]);

  const idx = indexSnapshot(scenario.input_snapshot);
  const heightLimit = baselineHeightLimitMm(idx);
  const byOrder = new Map(validation.orders.map((o) => [o.order_id, o]));

  const reviewRequired = validation.orders.filter((o) => o.input_state === "REVIEW_REQUIRED");
  const valid = validation.orders.filter((o) => o.input_state === "VALID");

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header>
        <Header />
        <div className="bg-white px-6 pt-6 pb-4">
          <div className="max-w-[1060px] mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">입력 검증</h1>
            <p className="text-sm text-gray-500 mt-1">
              누락·모순된 값을 찾아냅니다. 모르는 값은 채워 넣지 않습니다
            </p>
          </div>
        </div>
        <SceneNav scenarioId={scenarioId} runId={runId ?? null} />
      </header>

      <main className="max-w-[1060px] mx-auto px-6 py-8 flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge label={validation.validation_status} size="sm" />
          <span className="text-sm text-gray-500">
            시나리오 <code className="font-mono">{validation.scenario_id}</code>
          </span>
        </div>

        <div className="flex flex-wrap gap-4">
          <StatCard value={validation.orders.length} label="전체 주문" color="default" />
          <StatCard value={valid.length} label="유효" color="green" />
          <StatCard value={reviewRequired.length} label="확인 필요" color="amber" />
        </div>

        <Section title="주문 입력" accent="blue">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-200">
                  <th className="py-2 pr-3 font-medium">주문</th>
                  <th className="py-2 pr-3 font-medium">구간</th>
                  <th className="py-2 pr-3 font-medium">준비</th>
                  <th className="py-2 pr-3 font-medium">납기</th>
                  <th className="py-2 pr-3 font-medium">중량</th>
                  <th className="py-2 pr-3 font-medium">높이</th>
                  <th className="py-2 pr-3 font-medium">우선</th>
                  <th className="py-2 pr-3 font-medium">후보 슬롯</th>
                  <th className="py-2 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {scenario.input_snapshot.orders.map((order) => {
                  const result = byOrder.get(order.order_id);
                  const weightMissing = order.gross_weight_kg === null;
                  const overHeight =
                    heightLimit !== null && order.dimensions_mm.height > heightLimit;
                  return (
                    <tr key={order.order_id} className="border-b border-gray-100">
                      <td className="py-2.5 pr-3">
                        <code className="font-mono font-medium text-gray-900">
                          {order.order_id}
                        </code>
                      </td>
                      <td className="py-2.5 pr-3 text-gray-500">
                        {terminalName(idx, order.origin_terminal_ids[0])} →{" "}
                        {terminalName(idx, order.destination_terminal_ids[0])}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-500">{formatTime(order.ready_at)}</td>
                      <td className="py-2.5 pr-3 text-gray-500">{formatTime(order.due_at)}</td>
                      <td
                        className={`py-2.5 pr-3 ${weightMissing ? "text-amber-600 font-medium" : "text-gray-500"}`}
                      >
                        {weightMissing ? "누락" : formatTonnes(order.gross_weight_kg)}
                      </td>
                      <td
                        className={`py-2.5 pr-3 ${overHeight ? "text-red-600 font-medium" : "text-gray-500"}`}
                      >
                        {formatMm(order.dimensions_mm.height)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <StatusBadge label={order.priority_class} size="sm" />
                      </td>
                      <td className="py-2.5 pr-3 text-gray-500">
                        {result?.eligible_slot_ids.length ?? 0}개
                      </td>
                      <td className="py-2.5">
                        {result && (
                          <StatusBadge
                            label={result.input_state === "VALID" ? "유효" : "확인 필요"}
                            size="sm"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {reviewRequired.length > 0 && (
          <Section title="확인이 필요한 주문" accent="amber">
            <div className="flex flex-col gap-2">
              {reviewRequired.map((o) => (
                <ReasonRow
                  key={o.order_id}
                  code={o.primary_reason_code ?? "REVIEW_REQUIRED"}
                  severity="warning"
                  message={`${o.order_id} — ${reasonLabel(o.primary_reason_code) ?? "확인 필요"}${
                    o.missing_fields.length ? `: ${o.missing_fields.join(", ")}` : ""
                  }`}
                />
              ))}
            </div>
          </Section>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
          <span>입력 출처</span>
          <SourceBadge type={scenario.input_snapshot.assumptions[0]?.source_type ?? "DEMO_ASSUMPTION"} />
          {heightLimit !== null && <span>· 기준 경로 높이 한도 {formatMm(heightLimit)}</span>}
        </div>

        <Alert type="info">
          <strong className="text-gray-900">핵심</strong> — 누락된 값은 추정하지 않고
          누락으로 보고합니다. 확인 필요 주문은 편성에서 빠지지만 시나리오를 막지는
          않습니다.
        </Alert>
      </main>
    </div>
  );
}
