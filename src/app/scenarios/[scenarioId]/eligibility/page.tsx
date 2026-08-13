import { getScenario, validateScenario } from "@/lib/api";
import {
  Alert,
  Header,
  ReasonRow,
  SceneNav,
  Section,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { formatMm, formatTonnes } from "@/lib/view/format";
import { reasonLabel } from "@/lib/view/reasons";
import { baselineHeightLimitMm, indexSnapshot } from "@/lib/view/snapshot";

export const dynamic = "force-dynamic";

export default async function EligibilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  const { scenarioId } = await params;
  const { run: runId } = await searchParams;

  const [scenario, validation] = await Promise.all([
    getScenario(scenarioId),
    validateScenario(scenarioId),
  ]);

  const idx = indexSnapshot(scenario.input_snapshot);
  const heightLimit = baselineHeightLimitMm(idx);

  const eligible = validation.orders.filter((o) => o.eligibility_state === "ELIGIBLE");
  const ineligible = validation.orders.filter((o) => o.eligibility_state === "INELIGIBLE");
  const notEvaluated = validation.orders.filter(
    (o) => o.eligibility_state === "NOT_EVALUATED",
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header>
        <Header />
        <div className="bg-white px-6 pt-6 pb-4">
          <div className="max-w-[1060px] mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">후보 검토</h1>
            <p className="text-sm text-gray-500 mt-1">
              하드 제약을 통과한 주문과, 통과하지 못한 이유를 확인합니다
            </p>
          </div>
        </div>
        <SceneNav scenarioId={scenarioId} runId={runId ?? null} />
      </header>

      <main className="max-w-[1060px] mx-auto px-6 py-8 flex flex-col gap-5">
        <div className="flex flex-wrap gap-4">
          <StatCard value={eligible.length} label="적합" color="green" />
          <StatCard value={ineligible.length} label="부적합" color="red" />
          <StatCard value={notEvaluated.length} label="미평가" color="muted" />
        </div>

        <Section title="주문별 적합성" accent="blue">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-200">
                  <th className="py-2 pr-3 font-medium">주문</th>
                  <th className="py-2 pr-3 font-medium">우선</th>
                  <th className="py-2 pr-3 font-medium">중량</th>
                  <th className="py-2 pr-3 font-medium">높이</th>
                  <th className="py-2 pr-3 font-medium">후보 슬롯</th>
                  <th className="py-2 pr-3 font-medium">적합성</th>
                  <th className="py-2 font-medium">주 사유</th>
                </tr>
              </thead>
              <tbody>
                {validation.orders.map((result) => {
                  const order = idx.orderById.get(result.order_id);
                  const overHeight =
                    heightLimit !== null &&
                    order != null &&
                    order.dimensions_mm.height > heightLimit;
                  return (
                    <tr key={result.order_id} className="border-b border-gray-100">
                      <td className="py-2.5 pr-3">
                        <code className="font-mono font-medium text-gray-900">
                          {result.order_id}
                        </code>
                      </td>
                      <td className="py-2.5 pr-3">
                        {order && <StatusBadge label={order.priority_class} size="sm" />}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-500">
                        {order?.gross_weight_kg === null
                          ? "누락"
                          : formatTonnes(order?.gross_weight_kg)}
                      </td>
                      <td
                        className={`py-2.5 pr-3 ${overHeight ? "text-red-600 font-medium" : "text-gray-500"}`}
                      >
                        {formatMm(order?.dimensions_mm.height)}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-500">
                        {result.eligible_slot_ids.length}개
                      </td>
                      <td className="py-2.5 pr-3">
                        <StatusBadge
                          label={
                            result.eligibility_state === "ELIGIBLE"
                              ? "적합"
                              : result.eligibility_state === "INELIGIBLE"
                                ? "부적합"
                                : "미평가"
                          }
                          size="sm"
                        />
                      </td>
                      <td className="py-2.5 text-gray-500">
                        {reasonLabel(result.primary_reason_code) ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {ineligible.length > 0 && (
          <Section title="부적합 사유" accent="red">
            <div className="flex flex-col gap-2">
              {ineligible.map((result) => (
                <ReasonRow
                  key={result.order_id}
                  code={result.primary_reason_code ?? "INELIGIBLE"}
                  severity="error"
                  message={`${result.order_id} — ${
                    reasonLabel(result.primary_reason_code) ?? "부적합"
                  }${
                    result.reason_codes.length > 1
                      ? ` (그 외 ${result.reason_codes.length - 1}건)`
                      : ""
                  }`}
                />
              ))}
            </div>
          </Section>
        )}

        <Alert type="info">
          <strong className="text-gray-900">핵심</strong> — 주 사유는 여러 위반 중 02 §6의
          우선순위로 하나를 고른 것입니다. 나머지 사유도 함께 기록됩니다.
        </Alert>
      </main>
    </div>
  );
}
