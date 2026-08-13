import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createRun,
  createScenario,
  getScenario,
  structureOrders,
  validateScenario,
} from "@/lib/api";
import type { OrderDraft } from "@/lib/api";
import { Header, OrderForm, Section, SourceBadge, StatusBadge } from "@/components/ui";
import {
  formValuesFrom,
  nextOrderId,
  orderFromDraft,
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
  searchParams: Promise<{ text?: string; pick?: string }>;
}) {
  const { scenarioId } = await params;
  const { text, pick } = await searchParams;

  const scenario = await getScenario(scenarioId);
  const snapshot = scenario.input_snapshot;

  // Batched, because one message routinely asks for several trailers. Without a
  // model key it comes back as a single draft and says so.
  const batch = text?.trim() ? await structureOrders(text, snapshot.as_of) : null;
  const drafts = batch?.orders ?? [];
  const picked = Math.min(Math.max(Number(pick ?? 0) || 0, 0), Math.max(drafts.length - 1, 0));
  const intake = drafts[picked] ?? null;

  const draft: OrderDraft | null = intake?.order_draft ?? null;
  const evidenceByField = new Map(
    (intake?.field_evidence ?? []).map((e) => [e.field, e.source_text]),
  );
  const filled = filledFields(draft);
  const orderId = nextOrderId(snapshot);

  const base = `/scenarios/${encodeURIComponent(scenarioId)}`;
  const withPick = (index: number) =>
    `${base}/orders/new?text=${encodeURIComponent(text ?? "")}&pick=${index}`;

  /**
   * Add every draft the document asked for, in one derived scenario.
   *
   * Nothing here is reviewed field by field, which is the honest trade: a draft
   * missing a weight lands as `확인 필요` exactly as ORD-006 does, and the
   * screen says so rather than filling the gap. An operator who wants to check
   * one first opens it in the form above.
   */
  async function addAll() {
    "use server";

    let derived = snapshot;
    const added: string[] = [];

    for (const entry of drafts) {
      const order = orderFromDraft(entry.order_draft, derived);
      derived = snapshotWithOrder(derived, order);
      added.push(order.order_id);
    }

    const created = await createScenario({
      scenario_name: `주문 ${added.length}건 추가 (${added.join(", ")})`,
      as_of: scenario.as_of,
      baseline_service_ids: [...scenario.baseline_service_ids],
      policy_version: scenario.policy_version,
      assumption_ids: [...scenario.assumption_ids],
      input_snapshot: derived,
      parent_scenario_id: scenario.scenario_id,
    });

    await validateScenario(created.scenario_id);
    await createRun(created.scenario_id);

    redirect(`/scenarios/${encodeURIComponent(created.scenario_id)}`);
  }

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
    <div className="min-h-screen bg-canvas font-sans">
      <header className="bg-white border-b border-line">
        <Header width="narrow" />
        <div className="max-w-[860px] mx-auto px-6 py-3">
          <Link href={base} className="text-[13px] text-korail-blue hover:underline">
            ← <code className="font-mono">{scenario.scenario_id}</code>
          </Link>
          <h1 className="text-lg font-semibold text-ink mt-1.5">주문 추가</h1>
          <p className="text-[13px] text-ink-3 mt-0.5">
            새 시나리오로 편성됩니다. 현재 시나리오는 그대로입니다
          </p>
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-6 py-6 flex flex-col gap-4">
        <Section
          title="의뢰 문장에서 주문 정보 추출"
          headerRight={<span className="text-[13px]">선택 사항</span>}
        >
          {/* A GET form: structuring reads the text and stores nothing, so the
              result belongs in the URL where it can be reloaded and shared. */}
          <form method="get" className="flex flex-col gap-3">
            <textarea
              name="text"
              rows={3}
              defaultValue={text ?? ""}
              placeholder="예: 내일 오전 9시까지 합류 터미널 A로 트레일러 한 대 반입, 도착 터미널 B로 저녁까지 보내주세요. 18톤입니다."
              className="field w-full h-auto py-2 leading-6"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="btn">
                값 추출
              </button>
              <span className="text-[13px] text-ink-3">
                건너뛰고 아래에 직접 입력해도 됩니다
              </span>
            </div>
          </form>

          {drafts.length > 1 && (
            <div className="mt-4 pt-4 border-t border-line flex flex-col gap-3">
              <span className="text-[13px] text-ink-3">
                이 문장에서 주문 {drafts.length}건을 추출했습니다
                {batch?.truncated && " (더 있었지만 잘렸습니다)"}
              </span>

              <div className="flex flex-col gap-2">
                {drafts.map((entry, index) => (
                  <Link
                    key={index}
                    href={withPick(index)}
                    className={`rounded-md border px-3 py-2 flex flex-wrap items-center gap-2 text-sm transition-colors ${
                      index === picked
                        ? "border-korail-blue bg-korail-blue/5"
                        : "border-line hover:border-line-strong"
                    }`}
                  >
                    <span className="font-medium text-ink">{index + 1}번</span>
                    <StatusBadge
                      label={entry.input_state === "VALID" ? "유효" : "확인 필요"}
                      size="sm"
                    />
                    <span className="text-[13px] text-ink-2">
                      {filledFields(entry.order_draft)
                        .map(({ field, value }) => `${fieldLabel(field)} ${value}`)
                        .join(" · ") || "읽은 값 없음"}
                    </span>
                    {index === picked && (
                      <span className="ml-auto text-[13px] text-korail-blue">아래에 입력됨</span>
                    )}
                  </Link>
                ))}
              </div>

              <form action={addAll}>
                <button type="submit" className="btn btn-primary">
                  {drafts.length}건 모두 추가하고 편성
                </button>
              </form>
            </div>
          )}

          {intake && (
            <div className="mt-4 pt-4 border-t border-line flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={intake.input_state === "VALID" ? "유효" : "확인 필요"}
                  size="sm"
                />
                <code className="text-[13px] font-mono text-ink-3">{intake.source}</code>
                <SourceBadge type={intake.assumption_note} />
              </div>

              {filled.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[13px] text-ink-3">
                    추출한 값
                    {evidenceByField.size === 0 &&
                      " (규칙 기반 추출은 근거 문장을 남기지 않습니다)"}
                  </span>
                  {filled.map(({ field, value }) => (
                    <div key={field} className="flex flex-wrap items-baseline gap-2 text-sm">
                      <span className="text-ink-3">{fieldLabel(field)}</span>
                      <span className="font-medium text-ink">{value}</span>
                      {evidenceByField.has(field) && (
                        <>
                          <span className="text-ink-3">←</span>
                          <span className="text-ink-2">“{evidenceByField.get(field)}”</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-2">
                  추출할 수 있는 값이 없습니다. 아래에 직접 입력하세요.
                </p>
              )}

              {intake.missing_fields.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] text-ink-3">비어 있음</span>
                  {intake.missing_fields.map((field) => (
                    <code
                      key={field}
                      className="text-[13px] font-mono px-1.5 py-px rounded-md border border-warn-line bg-warn-bg text-warn"
                    >
                      {fieldLabel(field)}
                    </code>
                  ))}
                </div>
              )}
            </div>
          )}
        </Section>

        <Section title={`${orderId} 확인`}>
          <OrderForm
            snapshot={snapshot}
            values={formValuesFrom(snapshot, draft)}
            action={addOrder}
            submitLabel="이 주문을 더해 새 시나리오 편성"
          />
        </Section>
      </main>
    </div>
  );
}
