import type { ScenarioInputSnapshot } from "@/lib/api";
import type { OrderFormValues } from "@/lib/view/draft";

/**
 * OrderForm — 주문 하나의 값을 확인하고 확정하는 폼
 *
 * 새 주문과 기존 주문 수정이 같은 폼을 쓴다. 두 경우 모두 결과는 하나다 — 이
 * 주문을 담은 **새 시나리오**. 스냅샷은 불변이라 값을 고치는 것도 원본을 바꾸는
 * 게 아니라 파생본을 만드는 일이고, 원본에 기록된 결정은 그대로 남아야 한다.
 *
 * 총중량만 비워 둘 수 있다. 모르는 값을 0이나 평균으로 채우지 않고 비운 채로
 * 보내면 검증이 `확인 필요`로 잡는다 — 정본 시나리오의 ORD-006이 지나는 그 경로다.
 */

const DIMENSIONS = [
  ["length", "길이"],
  ["width", "폭"],
  ["height", "높이"],
] as const;

export function OrderForm({
  snapshot,
  values,
  action,
  submitLabel,
}: {
  snapshot: ScenarioInputSnapshot;
  values: OrderFormValues;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="field-label">
          <span>화주</span>
          <select
            name="shipper_id"
            defaultValue={values.shipper_id}
            className="field"
          >
            {snapshot.shippers.map((shipper) => (
              <option key={shipper.shipper_id} value={shipper.shipper_id}>
                {shipper.display_name}
              </option>
            ))}
          </select>
        </label>

        <label className="field-label">
          <span>우선순위</span>
          <select
            name="priority_class"
            defaultValue={values.priority_class}
            className="field"
          >
            {["P1", "P2", "P3"].map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>

        {(
          [
            ["origin_terminal_id", "출발 터미널", values.origin_terminal_id],
            ["destination_terminal_id", "도착 터미널", values.destination_terminal_id],
          ] as const
        ).map(([name, label, value]) => (
          <label key={name} className="field-label">
            <span>{label}</span>
            <select
              name={name}
              defaultValue={value}
              className="field"
            >
              {snapshot.terminals.map((terminal) => (
                <option key={terminal.terminal_id} value={terminal.terminal_id}>
                  {terminal.display_name}
                </option>
              ))}
            </select>
          </label>
        ))}

        {(
          [
            ["ready_at", "준비 시각 (KST)", values.ready_at],
            ["due_at", "납기 (KST)", values.due_at],
          ] as const
        ).map(([name, label, value]) => (
          <label key={name} className="field-label">
            <span>{label}</span>
            <input
              type="datetime-local"
              name={name}
              required
              defaultValue={value}
              className="field"
            />
          </label>
        ))}

        <label className="field-label">
          <span>총중량 (kg)</span>
          <input
            type="number"
            name="gross_weight_kg"
            min={1}
            defaultValue={values.gross_weight_kg}
            placeholder="모르면 비워 두세요"
            className="field"
          />
        </label>

        <label className="field-label">
          <span>규격 태그</span>
          <select
            name="compatibility_tag"
            defaultValue={values.compatibility_tag}
            className="field"
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
        {DIMENSIONS.map(([name, label]) => (
          <label key={name} className="field-label">
            <span>{label} (mm)</span>
            <input
              type="number"
              name={name}
              min={1}
              required
              defaultValue={values[name]}
              className="field"
            />
          </label>
        ))}
      </div>

      <button type="submit" className="btn btn-primary self-start">
        {submitLabel}
      </button>
    </form>
  );
}
