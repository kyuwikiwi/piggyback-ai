import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createRun, createScenario, getScenario, readValidation, validateScenario } from "@/lib/api";
import { Alert, Header, OrderForm, Section, StatusBadge } from "@/components/ui";
import { formValuesFrom, orderFromForm, snapshotWithOrder } from "@/lib/view/draft";
import { fieldLabel } from "@/lib/view/fields";
import { reasonLabel } from "@/lib/view/reasons";

export const dynamic = "force-dynamic";

/**
 * Correct one order's values.
 *
 * Without this the demo could show `확인 필요` and never resolve it: ORD-006 is
 * held out of the plan for a missing weight, and there was no way to supply
 * one. "Never guess a missing operational value" is only half a rule -- the
 * other half is somewhere to put the value once someone knows it.
 *
 * Correcting is not an edit of this scenario. The snapshot is immutable and
 * carries the hash the run reproduces from, and decisions were recorded against
 * that run, so the corrected order goes into a derived scenario and the
 * original stays exactly as it was.
 */
export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ scenarioId: string; orderId: string }>;
}) {
  const { scenarioId, orderId } = await params;

  const scenario = await getScenario(scenarioId);
  const snapshot = scenario.input_snapshot;
  const order = snapshot.orders.find((o) => o.order_id === orderId);
  if (!order) notFound();

  const validation = await readValidation(scenarioId);
  const verdict = validation?.orders.find((o) => o.order_id === orderId) ?? null;

  const base = `/scenarios/${encodeURIComponent(scenarioId)}`;

  async function saveOrder(formData: FormData) {
    "use server";

    const corrected = orderFromForm(formData, snapshot, orderId);
    const created = await createScenario({
      // Neither the order count nor the baseline changes when a value is
      // corrected, so the name is the only thing that can tell a list row what
      // this scenario is.
      scenario_name: `${orderId} 값 수정`,
      as_of: scenario.as_of,
      baseline_service_ids: [...scenario.baseline_service_ids],
      policy_version: scenario.policy_version,
      assumption_ids: [...scenario.assumption_ids],
      input_snapshot: snapshotWithOrder(snapshot, corrected),
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
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <h1 className="text-lg font-semibold text-ink">
              <code className="font-mono">{orderId}</code> 값 수정
            </h1>
            {verdict && (
              <StatusBadge
                label={verdict.input_state === "VALID" ? "유효" : "확인 필요"}
                size="sm"
              />
            )}
          </div>
          <p className="text-[13px] text-ink-3 mt-0.5">
            새 시나리오로 편성됩니다. 현재 시나리오와 결정 기록은 그대로입니다
          </p>
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-6 py-6 flex flex-col gap-4">
        {verdict && verdict.missing_fields.length > 0 && (
          <Alert type="warning">
            <strong className="text-ink">
              {reasonLabel(verdict.primary_reason_code) ?? "확인 필요"}
            </strong>
            <br />
            <span>
              {verdict.missing_fields.map(fieldLabel).join(", ")}이(가) 비어 있어 이 주문은
              계산에서 빠져 있습니다. 값을 채우면 다시 계산됩니다.
            </span>
          </Alert>
        )}

        <Section title="주문 값">
          <OrderForm
            snapshot={snapshot}
            values={formValuesFrom(snapshot, order)}
            action={saveOrder}
            submitLabel="고친 값으로 새 시나리오 편성"
          />
        </Section>
      </main>
    </div>
  );
}
