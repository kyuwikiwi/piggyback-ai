/**
 * Korean names for the order fields, and what a draft actually filled.
 *
 * Shared by the add and edit screens: both point at the same field vocabulary,
 * and the intake layer names gaps with dotted paths (`dimensions_mm.width`)
 * that only mean something to someone reading the schema.
 */
import type { Order, OrderDraft } from "@/lib/api";

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
  adjustment_window: "승인 범위",
};

export function fieldLabel(field: string): string {
  return FIELD_LABEL[field] ?? field;
}

/**
 * What the draft actually filled, as text.
 *
 * Evidence quotes only come back from the model path; the rule-based fallback
 * fills fields without them. Listing evidence alone made the page announce that
 * nothing was extracted while the form below sat pre-filled with a weight the
 * rules had found. The filled values are the claim; a quote is the supporting
 * detail when there is one.
 */
export function filledFields(
  draft: OrderDraft | Order | null,
): { field: string; value: string }[] {
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
