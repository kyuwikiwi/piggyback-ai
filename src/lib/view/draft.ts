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
import type { Order, OrderDraft, ScenarioInputSnapshot } from "@/lib/api";

/** What the order form shows, as the strings its inputs take. */
export interface OrderFormValues {
  shipper_id: string;
  priority_class: string;
  origin_terminal_id: string;
  destination_terminal_id: string;
  ready_at: string;
  due_at: string;
  gross_weight_kg: string;
  compatibility_tag: string;
  length: string;
  width: string;
  height: string;
}

/** `2026-08-17T09:00:00+09:00` -> `2026-08-17T09:00`, which is what the input wants. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso);
  return match ? `${match[1]}T${match[2]}` : "";
}

const text = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

/**
 * Form values from whatever the caller has.
 *
 * A draft fills what it read and leaves the rest null; an existing order fills
 * everything except, sometimes, the one value that made it 확인 필요. Both are
 * the same shape to this form: blanks stay blank rather than acquiring a
 * default on the way to the screen.
 */
export function formValuesFrom(
  snapshot: ScenarioInputSnapshot,
  source: OrderDraft | Order | null,
): OrderFormValues {
  const asOfDate = snapshot.as_of.slice(0, 10);
  const dimensions = (source?.dimensions_mm ?? null) as {
    length?: number | null;
    width?: number | null;
    height?: number | null;
  } | null;

  return {
    shipper_id: text(source?.shipper_id) || (snapshot.shippers[0]?.shipper_id ?? ""),
    priority_class: text(source?.priority_class) || "P2",
    origin_terminal_id:
      text(source?.origin_terminal_ids?.[0]) || (snapshot.terminals[0]?.terminal_id ?? ""),
    destination_terminal_id:
      text(source?.destination_terminal_ids?.[0]) || (snapshot.terminals[1]?.terminal_id ?? ""),
    ready_at: toLocalInput(source?.ready_at) || `${asOfDate}T09:00`,
    due_at: toLocalInput(source?.due_at) || `${asOfDate}T18:00`,
    gross_weight_kg: text(source?.gross_weight_kg),
    compatibility_tag: text(source?.compatibility_tags?.[0]) || "TRAILER_STANDARD",
    length: text(dimensions?.length) || "13600",
    width: text(dimensions?.width) || "2500",
    height: text(dimensions?.height) || "3900",
  };
}

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

/**
 * An order straight from a draft, without a form in between.
 *
 * Used when a document asked for several at once. Nulls survive as nulls --
 * a draft with no weight becomes an order with no weight, which the validator
 * answers with `확인 필요`. Filling them in here to make the batch look tidy
 * would be the one thing this system exists not to do.
 */
export function orderFromDraft(
  draft: OrderDraft,
  snapshot: ScenarioInputSnapshot,
  orderId: string = nextOrderId(snapshot),
): Order {
  const values = formValuesFrom(snapshot, draft);
  const form = new FormData();
  for (const [field, value] of Object.entries(values)) form.set(field, value);
  // The one field a blank must survive: `formValuesFrom` leaves it empty and
  // `orderFromForm` turns an empty string into null.
  form.set("gross_weight_kg", draft.gross_weight_kg == null ? "" : String(draft.gross_weight_kg));

  return orderFromForm(form, snapshot, orderId);
}

export function orderFromForm(
  formData: FormData,
  snapshot: ScenarioInputSnapshot,
  /** Editing an existing order keeps its id; a new one takes the next. */
  orderId: string = nextOrderId(snapshot),
): Order {
  const asOfDate = snapshot.as_of.slice(0, 10);
  const existing = snapshot.orders.find((o) => o.order_id === orderId);

  return {
    order_id: orderId,
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
    // Never invented, and never dropped either. A new order has no approval
    // window because nobody has agreed to move it; an edited one keeps the one
    // it already had, since filling in a weight is not a withdrawal of consent.
    adjustment_window: existing?.adjustment_window ?? null,
  };
}

/**
 * The same snapshot with this order added, or replaced where it already is.
 *
 * A scenario is an immutable snapshot, so neither adding nor correcting an
 * order is an edit of it -- both produce a new document that a new scenario is
 * created from. The original keeps its hash and the decisions recorded against
 * it, which have to keep pointing at the plan they were made on.
 *
 * Replacing in place rather than appending matters: an order moved to the end
 * of the list would change every screen's ordering and, worse, would change the
 * document the snapshot hash is taken over for a value that did not move.
 */
export function snapshotWithOrder(
  snapshot: ScenarioInputSnapshot,
  order: Order,
): ScenarioInputSnapshot {
  const index = snapshot.orders.findIndex((o) => o.order_id === order.order_id);
  if (index < 0) return { ...snapshot, orders: [...snapshot.orders, order] };

  const orders = [...snapshot.orders];
  orders[index] = order;
  return { ...snapshot, orders };
}
