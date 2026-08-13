import type { Assignment, Slot } from "@/lib/api";
import { formatTonnes } from "@/lib/view/format";
import { wagonsOfService, type SnapshotIndex } from "@/lib/view/snapshot";

/**
 * WagonDiagram — 화차 한 량과 그 위의 슬롯
 *
 * 슬롯의 가로 위치는 스냅샷의 `slot.display.x`를 쓴다. 정본 시나리오가 12·50·88을
 * 담고 있는 건 도면으로 그리라는 뜻이고, 균등 그리드로 그리면 슬롯 배치가 다른
 * 화차가 들어왔을 때 화면이 조용히 거짓말을 한다.
 *
 * 폭은 이웃 슬롯과의 중점까지로 잡는다. x만 보고 고정폭을 주면 간격이 좁은 화차에서
 * 카드가 겹친다.
 */

interface Band {
  slot: Slot;
  left: number;
  width: number;
}

function layout(slots: readonly Slot[]): Band[] {
  const ordered = slots.slice().sort((a, b) => a.position - b.position);
  const xs = ordered.map((slot) => slot.display?.x);

  // Even spacing is the fallback, not the default: it is what a snapshot without
  // usable coordinates gets, and it keeps the diagram drawable either way.
  const usable = xs.every((x) => typeof x === "number" && Number.isFinite(x));
  const positions = usable
    ? (xs as number[])
    : ordered.map((_, i) => ((i + 0.5) / ordered.length) * 100);

  return ordered.map((slot, i) => {
    const left = i === 0 ? 0 : (positions[i - 1] + positions[i]) / 2;
    const right = i === ordered.length - 1 ? 100 : (positions[i] + positions[i + 1]) / 2;
    return { slot, left, width: Math.max(right - left, 0) };
  });
}

function SlotCard({
  idx,
  slot,
  assignment,
  highlightOrderId,
  stacked = false,
}: {
  idx: SnapshotIndex;
  slot: Slot;
  assignment: Assignment | undefined;
  highlightOrderId: string | null;
  stacked?: boolean;
}) {
  const order = assignment ? idx.orderById.get(assignment.order_id) : undefined;
  const highlighted = highlightOrderId !== null && assignment?.order_id === highlightOrderId;

  return (
    <div
      className={`rounded-md border ${
        stacked
          ? "flex items-center gap-2 px-3 py-2"
          : "h-full flex flex-col items-center justify-center"
      } ${
        assignment
          ? highlighted
            ? "border-korail-blue bg-blue-50"
            : "border-emerald-300 bg-emerald-50"
          : slot.available
            ? "border-dashed border-gray-300 bg-white"
            : "border-gray-200 bg-gray-100"
      }`}
    >
      <code className="text-[10px] font-mono text-gray-400">{slot.slot_id}</code>
      {assignment ? (
        <>
          <span className="text-sm font-bold text-gray-900 leading-5">{assignment.order_id}</span>
          <span className="text-[11px] text-gray-500">
            {formatTonnes(order?.gross_weight_kg)}
            {order && ` · ${order.priority_class}`}
          </span>
        </>
      ) : (
        <span className={`text-xs text-gray-400 ${stacked ? "" : "mt-1"}`}>
          {slot.available ? "비어 있음" : "사용 불가"}
        </span>
      )}
    </div>
  );
}

export function WagonDiagram({
  idx,
  serviceId,
  assignments,
  highlightOrderId = null,
}: {
  idx: SnapshotIndex;
  serviceId: string;
  assignments: readonly Assignment[];
  highlightOrderId?: string | null;
}) {
  const assignmentBySlot = new Map(assignments.map((a) => [a.slot_id, a]));

  return (
    <div className="flex flex-col gap-4">
      {wagonsOfService(idx, serviceId).map((wagon) => {
        const slots = idx.slotsByWagon.get(wagon.wagon_id) ?? [];

        // A sum of snapshot weights, not a capacity verdict -- the solver already
        // decided what fits. It answers "how full is this wagon" at a glance.
        const loadedKg = slots.reduce((total, slot) => {
          const assigned = assignmentBySlot.get(slot.slot_id);
          const order = assigned ? idx.orderById.get(assigned.order_id) : undefined;
          return total + (order?.gross_weight_kg ?? 0);
        }, 0);

        return (
          <div key={wagon.wagon_id}>
            <div className="flex items-center justify-between mb-2">
              <code className="text-xs font-mono font-medium text-gray-500">{wagon.wagon_id}</code>
              <span className="text-xs text-gray-400">
                {formatTonnes(loadedKg)} / {formatTonnes(wagon.max_total_weight_kg)}
              </span>
            </div>

            <div className="rounded-lg border border-gray-300 bg-gray-50 p-1.5">
              {/* Below sm the coordinates stop helping: three slots across a
                  325px card leave 76px each, which is narrower than the id
                  printed on them. Stacked, every slot stays readable and the
                  order down the list is still the order along the wagon. */}
              <div className="flex flex-col gap-1.5 sm:hidden">
                {layout(slots).map(({ slot }) => (
                  <SlotCard
                    key={slot.slot_id}
                    idx={idx}
                    slot={slot}
                    assignment={assignmentBySlot.get(slot.slot_id)}
                    highlightOrderId={highlightOrderId}
                    stacked
                  />
                ))}
              </div>

              <div className="relative h-[74px] hidden sm:block">
                {layout(slots).map(({ slot, left, width }) => (
                  <div
                    key={slot.slot_id}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    className="absolute inset-y-0 px-[3px]"
                  >
                    <SlotCard
                      idx={idx}
                      slot={slot}
                      assignment={assignmentBySlot.get(slot.slot_id)}
                      highlightOrderId={highlightOrderId}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden sm:flex justify-between px-[12%] -mt-px" aria-hidden="true">
              {[0, 1].map((bogie) => (
                <div key={bogie} className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full border border-gray-300 bg-gray-200" />
                  <div className="w-2.5 h-2.5 rounded-full border border-gray-300 bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
