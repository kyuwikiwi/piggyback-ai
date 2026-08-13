/**
 * Turning an operator-completed draft into an order the snapshot can hold.
 *
 * The intake layer reads a document and leaves everything it could not find as
 * null. This module does the opposite job: it takes what the operator confirmed
 * in the form and builds the order, keeping a blank blank. A missing weight
 * becomes `null` and the validator answers `확인 필요` -- which is the same path
 * ORD-006 takes in the canonical scenario, and a far better outcome than a
 * plausible number nobody typed.
 */
import type { Order, ScenarioInputSnapshot } from "@/lib/api";

/** A blank field is a null, never a zero and never a default. */
function optionalInt(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function requiredInt(value: FormDataEntryValue | null, fallback: number): number {
  return optionalInt(value) ?? fallback;
}

/**
 * `datetime-local` has no zone, and the snapshot declares Asia/Seoul.
 *
 * Reading it as the server's local time would silently shift every order by
 * whatever the host is set to, so the offset is applied explicitly and the form
 * says KST next to the field.
 */
function seoulIso(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const withSeconds = text.length === 16 ? `${text}:00` : text;
  return `${withSeconds}+09:00`;
}

/** `ORD-010` after `ORD-009`, so the new order reads as the next one. */
export function nextOrderId(snapshot: ScenarioInputSnapshot): string {
  const numbers = snapshot.orders
    .map((order) => /^ORD-(\d+)$/.exec(order.order_id)?.[1])
    .filter((n): n is string => Boolean(n))
    .map(Number);
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `ORD-${String(next).padStart(3, "0")}`;
}

export function orderFromForm(formData: FormData, snapshot: ScenarioInputSnapshot): Order {
  const asOfDate = snapshot.as_of.slice(0, 10);

  return {
    order_id: nextOrderId(snapshot),
    shipper_id: String(formData.get("shipper_id") ?? snapshot.shippers[0]?.shipper_id ?? ""),
    origin_terminal_ids: [String(formData.get("origin_terminal_id") ?? "")],
    destination_terminal_ids: [String(formData.get("destination_terminal_id") ?? "")],
    // Times are the one place a blank cannot survive: the snapshot model
    // requires both, and an order with no window is not an order. The scenario's
    // own date is used rather than today's, so a demo dated in the future does
    // not silently produce an order outside every service.
    ready_at: seoulIso(formData.get("ready_at")) ?? `${asOfDate}T09:00:00+09:00`,
    due_at: seoulIso(formData.get("due_at")) ?? `${asOfDate}T18:00:00+09:00`,
    gross_weight_kg: optionalInt(formData.get("gross_weight_kg")),
    dimensions_mm: {
      length: requiredInt(formData.get("length"), 13600),
      width: requiredInt(formData.get("width"), 2500),
      height: requiredInt(formData.get("height"), 3900),
    },
    compatibility_tags: [
      String(formData.get("compatibility_tag") ?? "TRAILER_STANDARD"),
    ] as Order["compatibility_tags"],
    priority_class: (String(formData.get("priority_class") ?? "P2") ||
      "P2") as Order["priority_class"],
    // No approval window: nobody has agreed to move this order to another
    // service yet, and inventing one would let the alternative engine act on a
    // permission that was never given.
    adjustment_window: null,
  };
}

/**
 * The same snapshot with one more order.
 *
 * A scenario is an immutable snapshot, so adding an order is not an edit -- it
 * is a new document that a new scenario is created from. The original keeps its
 * hash and its recorded decisions.
 */
export function snapshotWithOrder(
  snapshot: ScenarioInputSnapshot,
  order: Order,
): ScenarioInputSnapshot {
  return { ...snapshot, orders: [...snapshot.orders, order] };
}
