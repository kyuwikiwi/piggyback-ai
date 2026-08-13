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
import { Alert, Header, Section, SourceBadge, StatusBadge } from "@/components/ui";
import { nextOrderId, orderFromForm, snapshotWithOrder } from "@/lib/view/draft";
import { indexSnapshot } from "@/lib/view/snapshot";

export const dynamic = "force-dynamic";

const FIELD_LABEL: Record<string, string> = {
  order_id: "주문 번호",
  shipper_id: "화주",
  origin_terminal_ids: "출발 터미널",
  destination_terminal_ids: "도착 터미널",
  ready_at: "준비 시각",
  due_at: "납기",
  gross_weight_kg: "총중량",
  dimensions_mm: "규격",
  "dimensions_mm.length": "길이",
  "dimensions_mm.width": "폭",
  "dimensions_mm.height": "높이",
  compatibility_tags: "규격 태그",
  priority_class: "우선순위",
};

const fieldLabel = (field: string) => FIELD_LABEL[field] ?? field;

/**
 * What the draft actually filled, as text.
 *
 * Evidence quotes only come back from the model path; the rule-based fallback
 * fills fields without them. Listing evidence alone made the page announce that
 * nothing was extracted while the form below sat pre-filled with a weight the
 * rules had found. The filled values are the claim, and the quote is the
 * supporting detail when there is one.
 */
function filledFields(draft: OrderDraft | null): { field: string; value: string }[] {
  if (!draft) return [];

  return Object.entries(draft).flatMap(([field, value]) => {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) {
      return value.length ? [{ field, value: value.join(", ") }] : [];
    }
    if (typeof value === "object") {
      const parts = Object.entries(value as Record<string, number | null>)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([axis, v]) => `${fieldLabel(`${field}.${axis}`)} ${v}`);
      return parts.length ? [{ field, value: parts.join(" · ") }] : [];
    }
    return [{ field, value: String(value) }];
  });
}

/** `2026-08-17T09:00:00+09:00` -> `2026-08-17T09:00`, which is what the input wants. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso);
  return match ? `${match[1]}T${match[2]}` : "";
}

/**
 * Add an order, by reading a request rather than filling a form from scratch.
 *
 * The structuring call is a POST that stores nothing, so it runs from the query
 * string: the same text always produces the same draft, and the URL can be
 * reloaded or shared. Only the confirm step writes, and what it writes is a new
 * scenario -- a snapshot is immutable, so an added order is a derived document,
 * not an edit of the one the decisions were recorded against.
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
  const idx = indexSnapshot(snapshot);

  const intake = text?.trim() ? await structureOrder(text, snapshot.as_of) : null;
  const draft = intake?.order_draft ?? null;
  const evidenceByField = new Map(
    (intake?.field_evidence ?? []).map((e) => [e.field, e.source_text]),
  );
  const filled = filledFields(draft);

  const base = `/scenarios/${encodeURIComponent(scenarioId)}`;

  async function addOrder(formData: FormData) {
    "use server";

    const order = orderFromForm(formData, snapshot);
    const derived = snapshotWithOrder(snapshot, order);

    const created = await createScenario({
      scenario_name: `${scenario.scenario_name}+${order.order_id}`,
      as_of: scenario.as_of,
      baseline_service_ids: [...scenario.baseline_service_ids],
      policy_version: scenario.policy_version,
      assumption_ids: [...scenario.assumption_ids],
      input_snapshot: derived,
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
            의뢰 문구에서 값을 뽑아 확인한 뒤, 이 주문을 더한 새 시나리오를 편성합니다
          </p>
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-6 py-8 flex flex-col gap-5">
        <Section title="① 의뢰 문구" accent="blue">
          {/* A GET form: structuring reads the text and stores nothing, so the
              result belongs in the URL where it can be reloaded and shared. */}
          <form method="get" className="flex flex-col gap-3">
            <textarea
              name="text"
              rows={3}
              required
              defaultValue={text ?? ""}
              placeholder="예: 내일 오전 9시까지 합류 터미널 A로 트레일러 한 대 반입, 부산 도착 터미널 B로 저녁까지 보내주세요. 18톤입니다."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 leading-6"
            />
            <button
              type="submit"
              className="self-start h-10 px-5 rounded-full bg-korail-blue text-white text-sm font-semibold hover:bg-[#004080]"
            >
              값 추출
            </button>
          </form>
        </Section>

        {intake && (
          <>
            <Section
              title="② 추출 결과"
              accent={intake.input_state === "VALID" ? "green" : "amber"}
              headerRight={
                <div className="flex items-center gap-2">
                  <StatusBadge
                    label={intake.input_state === "VALID" ? "유효" : "확인 필요"}
                    size="sm"
                  />
                  <code className="text-xs font-mono text-gray-400">{intake.source}</code>
                  <SourceBadge type={intake.assumption_note} />
                </div>
              }
            >
              <div className="flex flex-col gap-4">
                {filled.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-gray-400">
                      문구에서 옮긴 값{evidenceByField.size === 0 && " (규칙 기반 추출은 근거 문장을 남기지 않습니다)"}
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
            </Section>

            <Section title={`③ ${nextOrderId(snapshot)} 확인`} accent="green">
              <form action={addOrder} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-gray-500">화주</span>
                    <select
                      name="shipper_id"
                      defaultValue={draft?.shipper_id ?? snapshot.shippers[0]?.shipper_id}
                      className="h-10 rounded-lg border border-gray-300 px-3 text-gray-900"
                    >
                      {snapshot.shippers.map((shipper) => (
                        <option key={shipper.shipper_id} value={shipper.shipper_id}>
                          {shipper.display_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-gray-500">우선순위</span>
                    <select
                      name="priority_class"
                      defaultValue={draft?.priority_class ?? "P2"}
                      className="h-10 rounded-lg border border-gray-300 px-3 text-gray-900"
                    >
                      {["P1", "P2", "P3"].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-gray-500">출발 터미널</span>
                    <select
                      name="origin_terminal_id"
                      defaultValue={
                        draft?.origin_terminal_ids?.[0] ?? snapshot.terminals[0]?.terminal_id
                      }
                      className="h-10 rounded-lg border border-gray-300 px-3 text-gray-900"
                    >
                      {snapshot.terminals.map((terminal) => (
                        <option key={terminal.terminal_id} value={terminal.terminal_id}>
                          {terminal.display_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-gray-500">도착 터미널</span>
                    <select
                      name="destination_terminal_id"
                      defaultValue={
                        draft?.destination_terminal_ids?.[0] ?? snapshot.terminals[1]?.terminal_id
                      }
                      className="h-10 rounded-lg border border-gray-300 px-3 text-gray-900"
                    >
                      {snapshot.terminals.map((terminal) => (
                        <option key={terminal.terminal_id} value={terminal.terminal_id}>
                          {terminal.display_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-gray-500">준비 시각 (KST)</span>
                    <input
                      type="datetime-local"
                      name="ready_at"
                      required
                      defaultValue={
                        toLocalInput(draft?.ready_at) || `${snapshot.as_of.slice(0, 10)}T09:00`
                      }
                      className="h-10 rounded-lg border border-gray-300 px-3 text-gray-900"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-gray-500">납기 (KST)</span>
                    <input
                      type="datetime-local"
                      name="due_at"
                      required
                      defaultValue={
                        toLocalInput(draft?.due_at) || `${snapshot.as_of.slice(0, 10)}T18:00`
                      }
                      className="h-10 rounded-lg border border-gray-300 px-3 text-gray-900"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-gray-500">총중량 (kg)</span>
                    <input
                      type="number"
                      name="gross_weight_kg"
                      min={1}
                      defaultValue={draft?.gross_weight_kg ?? ""}
                      placeholder="모르면 비워 두세요"
                      className="h-10 rounded-lg border border-gray-300 px-3 text-gray-900"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="text-gray-500">규격 태그</span>
                    <select
                      name="compatibility_tag"
                      defaultValue={draft?.compatibility_tags?.[0] ?? "TRAILER_STANDARD"}
                      className="h-10 rounded-lg border border-gray-300 px-3 text-gray-900"
                    >
                      {["TRAILER_STANDARD", "TRAILER_TALL"].map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {(
                    [
                      ["length", "길이", 13600],
                      ["width", "폭", 2500],
                      ["height", "높이", 3900],
                    ] as const
                  ).map(([name, label, fallback]) => (
                    <label key={name} className="flex flex-col gap-1.5 text-sm">
                      <span className="text-gray-500">{label} (mm)</span>
                      <input
                        type="number"
                        name={name}
                        min={1}
                        required
                        defaultValue={draft?.dimensions_mm?.[name] ?? fallback}
                        className="h-10 rounded-lg border border-gray-300 px-3 text-gray-900"
                      />
                    </label>
                  ))}
                </div>

                <button
                  type="submit"
                  className="self-start h-11 px-6 rounded-full bg-korail-blue text-white text-sm font-semibold hover:bg-[#004080]"
                >
                  이 주문을 더해 새 시나리오 편성
                </button>
              </form>
            </Section>

            <Alert type="info">
              <strong className="text-gray-900">핵심</strong> — 중량을 비워 두면 추정하지 않고{" "}
              <strong className="text-gray-900">확인 필요</strong>로 잡힙니다. 그리고 이 주문은
              현재 시나리오를 고치는 것이 아니라, 주문이 하나 더 있는{" "}
              <strong className="text-gray-900">새 시나리오</strong>로 계산됩니다 —{" "}
              <code className="font-mono">{scenario.scenario_id}</code>와 그 결정 기록은 그대로
              남습니다.
            </Alert>
          </>
        )}

        <p className="text-xs text-gray-400">
          생성형 레이어는 문구를 읽어 값을 옮길 뿐이며, 없는 값을 만들어내지 않습니다. 터미널과
          화주는 이 시나리오의 id 목록 안에서만 선택됩니다. 사용 가능한 터미널{" "}
          {idx.terminalById.size}곳 · 화주 {snapshot.shippers.length}곳.
        </p>
      </main>
    </div>
  );
}
