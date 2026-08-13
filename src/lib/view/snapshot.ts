/**
 * Lookups over a ScenarioInputSnapshot.
 *
 * The API returns the snapshot flat -- wagons name their service, slots name
 * their wagon, services name a route constraint -- so every screen that draws a
 * train has to walk those references. Doing it inline meant a three-level
 * nested `.find()` inside JSX on the run page and an O(n·m) `.some()` on the
 * dashboard. Index once here instead.
 */
import type {
  Order,
  RouteConstraint,
  ScenarioInputSnapshot,
  Service,
  Slot,
  Terminal,
  Wagon,
} from "@/lib/api";

export interface SnapshotIndex {
  snapshot: ScenarioInputSnapshot;
  terminalById: Map<string, Terminal>;
  serviceById: Map<string, Service>;
  wagonById: Map<string, Wagon>;
  slotById: Map<string, Slot>;
  orderById: Map<string, Order>;
  routeConstraintById: Map<string, RouteConstraint>;
  wagonsByService: Map<string, Wagon[]>;
  slotsByWagon: Map<string, Slot[]>;
}

function groupBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const grouped = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = grouped.get(k);
    if (bucket) bucket.push(item);
    else grouped.set(k, [item]);
  }
  return grouped;
}

function index<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T> {
  return new Map(items.map((item) => [key(item), item]));
}

export function indexSnapshot(snapshot: ScenarioInputSnapshot): SnapshotIndex {
  return {
    snapshot,
    terminalById: index(snapshot.terminals, (t) => t.terminal_id),
    serviceById: index(snapshot.services, (s) => s.service_id),
    wagonById: index(snapshot.wagons, (w) => w.wagon_id),
    slotById: index(snapshot.slots, (s) => s.slot_id),
    orderById: index(snapshot.orders, (o) => o.order_id),
    routeConstraintById: index(snapshot.route_constraints, (r) => r.route_constraint_id),
    wagonsByService: groupBy(snapshot.wagons, (w) => w.service_id),
    slotsByWagon: groupBy(snapshot.slots, (s) => s.wagon_id),
  };
}

/** Display name if the snapshot has one, otherwise the raw id -- never a guess. */
export function terminalName(idx: SnapshotIndex, terminalId: string): string {
  return idx.terminalById.get(terminalId)?.display_name ?? terminalId;
}

export function slotsOfService(idx: SnapshotIndex, serviceId: string): Slot[] {
  return (idx.wagonsByService.get(serviceId) ?? [])
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .flatMap((w) => (idx.slotsByWagon.get(w.wagon_id) ?? []).slice().sort((a, b) => a.position - b.position));
}

export function wagonsOfService(idx: SnapshotIndex, serviceId: string): Wagon[] {
  return (idx.wagonsByService.get(serviceId) ?? [])
    .slice()
    .sort((a, b) => a.display_order - b.display_order);
}

/**
 * The height a load on this service has to clear.
 *
 * It is a property of the route, not the slot: SVC-AC-01 runs under RTC-AC at
 * 4200mm while the A-B services run under RTC-AB at 4000mm, and the same wagon
 * could be attached to either. Screens must read it from here rather than
 * hardcoding 4000.
 */
export function routeLimitsOfService(
  idx: SnapshotIndex,
  serviceId: string,
): RouteConstraint | undefined {
  const service = idx.serviceById.get(serviceId);
  return service ? idx.routeConstraintById.get(service.route_constraint_id) : undefined;
}

/** The tightest height limit across the baseline services -- what "the route" means on a summary screen. */
export function baselineHeightLimitMm(idx: SnapshotIndex): number | null {
  const limits = idx.snapshot.baseline_service_ids
    .map((id) => routeLimitsOfService(idx, id)?.max_height_mm)
    .filter((h): h is number => typeof h === "number");
  return limits.length ? Math.min(...limits) : null;
}

/**
 * Which adjustments this order's approval window permits.
 *
 * Only these may be asked for. Sending a forbidden type is a 409, and it should
 * be -- asking to raise a route clearance is a caller bug, not a planning
 * outcome.
 */
export function permittedAdjustments(order: Order | undefined): string[] {
  const window = order?.adjustment_window;
  if (!window) return [];
  const types: string[] = [];
  if (window.alternative_service_ids?.length) types.push("ADD_ORDER_APPROVED_SERVICE");
  if (window.alternative_destination_terminal_ids?.length) {
    types.push("CHANGE_TO_APPROVED_TERMINAL");
  }
  return types;
}
