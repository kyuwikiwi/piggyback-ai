import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createRun,
  createScenario,
  getScenario,
  structureOrder,
  validateScenario,
} from "@/lib/api";
import type { OrderDraft } from "@/lib/api";
import { Alert, Header, OrderForm, Section, SourceBadge, StatusBadge } from "@/components/ui";
import {
  formValuesFrom,
  nextOrderId,
  orderFromForm,
  snapshotWithOrder,
} from "@/lib/view/draft";
import { fieldLabel, filledFields } from "@/lib/view/fields";

export const dynamic = "force-dynamic";

/**
 * Add an order, either by reading a request or by filling the form.
 *
 * The structuring call is a POST that stores nothing, so it runs from the query
 * string: the same text always produces the same draft, and the URL can be
 * reloaded or shared. It is optional -- an operator who already knows the
 * values should not have to compose a sentence for a model to take apart, so
 * the form is always on the page and the text box only pre-fills it.
 *
 * Only confirming writes, and what it writes is a new scenario. A snapshot is
 * immutable, so an added order is a derived document rather than an edit of the
 * one the decisions were recorded against.
 */
export default async function NewOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string }>;
  searchParams: Promise<{ text?: string }>;
}) {
  const { scenarioId } = await params;
  const { text } = await searchParams;

  const scenario = await getScenario(scenarioId);
  const snapshot = scenario.input_snapshot;

  const intake = text?.trim() ? await structureOrder(text, snapshot.as_of) : null;
  const draft: OrderDraft | null = intake?.order_draft ?? null;
  const evidenceByField = new Map(
    (intake?.field_evidence ?? []).map((e) => [e.field, e.source_text]),
  );
  const filled = filledFields(draft);
  const orderId = nextOrderId(snapshot);

  const base = `/scenarios/${encodeURIComponent(scenarioId)}`;

  async function addOrder(formData: FormData) {
    "use server";

    const order = orderFromForm(formData, snapshot);
    const created = await createScenario({
      // The name is what a list row shows when the change_set is empty, which
      // it is for every snapshot assembled here -- change_set is reserved for
      // the two policy-approved adjustments. Written for a reader.
      scenario_name: `주문 ${order.order_id} 추가`,
      as_of: scenario.as_of,
      baseline_service_ids: [...scenario.baseline_service_ids],
      policy_version: scenario.policy_version,
      assumption_ids: [...scenario.assumption_ids],
      input_snapshot: snapshotWithOrder(snapshot, order),
      // The service derives its own alternatives and records their parent; this
      // snapshot was assembled here, so the lineage has to be declared or the
      // list shows it as a scenario someone started from scratch.
      parent_scenario_id: scenario.scenario_id,
    });

    await validateScenario(created.scenario_id);
    await createRun(created.scenario_id);

    // Outside any try/catch: redirect signals by throwing.
    redirect(`/scenarios/${encodeURIComponent(created.scenario_id)}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-200">
        <Header />
        <div className="max-w-[860px] mx-auto px-6 py-5">
          <Link href={base} className="text-sm text-korail-blue hover:underline">
            ← <code className="font-mono">{scenario.scenario_id}</code>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">주문 추가</h1>
          <p className="text-sm text-gray-500 mt-1">
            이 주문을 더한 새 시나리오를 편성합니다. 현재 시나리오는 그대로 남습니다
          </p>
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-6 py-8 flex flex-col gap-5">
        <Section
          title="의뢰 문구에서 값 뽑기"
          accent="blue"
          headerRight={<span className="text-xs text-gray-400">선택 사항</span>}
        >
          {/* A GET form: structuring reads the text and stores nothing, so the
              result belongs in the URL where it can be reloaded and shared. */}
          <form method="get" className="flex flex-col gap-3">
            <textarea
              name="text"
              rows={3}
              defaultValue={text ?? ""}
              placeholder="예: 내일 오전 9시까지 합류 터미널 A로 트레일러 한 대 반입, 도착 터미널 B로 저녁까지 보내주세요. 18톤입니다."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 leading-6"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="h-10 px-5 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:border-korail-blue hover:text-korail-blue"
              >
                값 추출
              </button>
              <span className="text-xs text-gray-400">
                건너뛰고 아래에서 바로 입력해도 됩니다
              </span>
            </div>
          </form>

          {intake && (
            <div className="mt-5 pt-5 border-t border-gray-100 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={intake.input_state === "VALID" ? "유효" : "확인 필요"}
                  size="sm"
                />
                <code className="text-xs font-mono text-gray-400">{intake.source}</code>
                <SourceBadge type={intake.assumption_note} />
              </div>

              {filled.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-gray-400">
                    문구에서 옮긴 값
                    {evidenceByField.size === 0 &&
                      " (규칙 기반 추출은 근거 문장을 남기지 않습니다)"}
                  </span>
                  {filled.map(({ field, value }) => (
                    <div key={field} className="flex flex-wrap items-baseline gap-2 text-sm">
                      <span className="text-gray-500">{fieldLabel(field)}</span>
                      <span className="font-medium text-gray-900">{value}</span>
                      {evidenceByField.has(field) && (
                        <>
                          <span className="text-gray-300">←</span>
                          <span className="text-gray-500">“{evidenceByField.get(field)}”</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  문구에서 확정할 수 있는 값이 없었습니다. 아래에서 직접 채우세요.
                </p>
              )}

              {intake.missing_fields.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-400">비어 있음</span>
                  {intake.missing_fields.map((field) => (
                    <code
                      key={field}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700"
                    >
                      {fieldLabel(field)}
                    </code>
                  ))}
                </div>
              )}
            </div>
          )}
        </Section>

        <Section title={`${orderId} 확인`} accent="green">
          <OrderForm
            snapshot={snapshot}
            values={formValuesFrom(snapshot, draft)}
            action={addOrder}
            submitLabel="이 주문을 더해 새 시나리오 편성"
          />
        </Section>

        <Alert type="info">
          <strong className="text-gray-900">핵심</strong> — 중량을 비워 두면 추정하지 않고{" "}
          <strong className="text-gray-900">확인 필요</strong>로 잡힙니다. 생성형 레이어는 문구를
          읽어 값을 옮길 뿐이며, 터미널과 화주는 이 시나리오의 id 목록 안에서만 선택됩니다.
        </Alert>
      </main>
    </div>
  );
}
