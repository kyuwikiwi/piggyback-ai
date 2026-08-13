import type { Order, Service, Wagon, Slot, Terminal, SourceRef } from "@/types";

const demoSource: SourceRef = {
  source_type: "DEMO_ASSUMPTION",
  source_name: "CANONICAL_V1",
  assumption_id: "ASM-001",
  approved_by: "팀",
};

// ─── 터미널 3개 ───
export const terminals: Terminal[] = [
  {
    terminal_id: "TRM-A",
    operating_windows: [{ open_time: "05:00", close_time: "23:00" }],
    intake_cutoff_rule: "출발 90분 전",
    minimum_handling_minutes: 30,
    supported_tags: ["TRAILER_STANDARD", "TRAILER_TALL"],
    source_ref: demoSource,
  },
  {
    terminal_id: "TRM-B",
    operating_windows: [{ open_time: "06:00", close_time: "22:00" }],
    intake_cutoff_rule: "출발 90분 전",
    minimum_handling_minutes: 30,
    supported_tags: ["TRAILER_STANDARD"],
    source_ref: demoSource,
  },
  {
    terminal_id: "TRM-C",
    operating_windows: [{ open_time: "05:00", close_time: "23:00" }],
    intake_cutoff_rule: "출발 90분 전",
    minimum_handling_minutes: 30,
    supported_tags: ["TRAILER_STANDARD", "TRAILER_TALL"],
    source_ref: demoSource,
  },
];

// ─── 운행 3개 ───
export const services: Service[] = [
  {
    service_id: "SVC-AM-01",
    origin_terminal_id: "TRM-A",
    destination_terminal_id: "TRM-B",
    departure_at: "2026-08-13T12:00:00+09:00",
    arrival_at: "2026-08-13T16:00:00+09:00",
    planning_cutoff_at: "2026-08-13T10:30:00+09:00",
    wagon_ids: ["WGN-01", "WGN-02"],
    status: "AVAILABLE",
  },
  {
    service_id: "SVC-NEXT-01",
    origin_terminal_id: "TRM-A",
    destination_terminal_id: "TRM-B",
    departure_at: "2026-08-13T18:00:00+09:00",
    arrival_at: "2026-08-13T22:00:00+09:00",
    planning_cutoff_at: "2026-08-13T16:30:00+09:00",
    wagon_ids: ["WGN-03"],
    status: "AVAILABLE",
  },
  {
    service_id: "SVC-AC-01",
    origin_terminal_id: "TRM-A",
    destination_terminal_id: "TRM-C",
    departure_at: "2026-08-13T14:00:00+09:00",
    arrival_at: "2026-08-13T18:00:00+09:00",
    planning_cutoff_at: "2026-08-13T12:30:00+09:00",
    wagon_ids: ["WGN-03"],
    status: "AVAILABLE",
  },
];

// ─── 화차 3량 · 슬롯 7개 ───
export const wagons: Wagon[] = [
  { wagon_id: "WGN-01", service_id: "SVC-AM-01", max_weight_kg: 48000, slot_ids: ["SLT-01", "SLT-02"], compatibility_tags: ["TRAILER_STANDARD"], available: true },
  { wagon_id: "WGN-02", service_id: "SVC-AM-01", max_weight_kg: 48000, slot_ids: ["SLT-03", "SLT-04"], compatibility_tags: ["TRAILER_STANDARD"], available: true },
  { wagon_id: "WGN-03", service_id: "SVC-NEXT-01", max_weight_kg: 48000, slot_ids: ["SLT-05", "SLT-06", "SLT-07"], compatibility_tags: ["TRAILER_STANDARD", "TRAILER_TALL"], available: true },
];

export const slots: Slot[] = [
  { slot_id: "SLT-01", wagon_id: "WGN-01", max_weight_kg: 24000, max_dimensions_mm: { length_mm: 14000, width_mm: 2600, height_mm: 4000 }, compatibility_tags: ["TRAILER_STANDARD"], position: 1, available: true, route_height_limit_mm: 4000 },
  { slot_id: "SLT-02", wagon_id: "WGN-01", max_weight_kg: 24000, max_dimensions_mm: { length_mm: 14000, width_mm: 2600, height_mm: 4000 }, compatibility_tags: ["TRAILER_STANDARD"], position: 2, available: true, route_height_limit_mm: 4000 },
  { slot_id: "SLT-03", wagon_id: "WGN-02", max_weight_kg: 24000, max_dimensions_mm: { length_mm: 14000, width_mm: 2600, height_mm: 4000 }, compatibility_tags: ["TRAILER_STANDARD"], position: 1, available: true, route_height_limit_mm: 4000 },
  { slot_id: "SLT-04", wagon_id: "WGN-02", max_weight_kg: 24000, max_dimensions_mm: { length_mm: 14000, width_mm: 2600, height_mm: 4000 }, compatibility_tags: ["TRAILER_STANDARD"], position: 2, available: false, route_height_limit_mm: 4000 },
  { slot_id: "SLT-05", wagon_id: "WGN-03", max_weight_kg: 24000, max_dimensions_mm: { length_mm: 14000, width_mm: 2600, height_mm: 4000 }, compatibility_tags: ["TRAILER_STANDARD"], position: 1, available: true, route_height_limit_mm: 4000 },
  { slot_id: "SLT-06", wagon_id: "WGN-03", max_weight_kg: 24000, max_dimensions_mm: { length_mm: 14000, width_mm: 2600, height_mm: 4300 }, compatibility_tags: ["TRAILER_STANDARD", "TRAILER_TALL"], position: 2, available: true, route_height_limit_mm: 4000 },
  { slot_id: "SLT-07", wagon_id: "WGN-03", max_weight_kg: 24000, max_dimensions_mm: { length_mm: 14000, width_mm: 2600, height_mm: 4000 }, compatibility_tags: ["TRAILER_STANDARD"], position: 3, available: true, route_height_limit_mm: 4000 },
];

// ─── 주문 9건 ───
export const orders: Order[] = [
  {
    order_id: "ORD-001",
    origin_terminal_ids: ["TRM-A"],
    destination_terminal_ids: ["TRM-B"],
    ready_at: "2026-08-13T08:00:00+09:00",
    due_at: "2026-08-13T18:00:00+09:00",
    gross_weight_kg: 22000,
    dimensions_mm: { length_mm: 13600, width_mm: 2500, height_mm: 3800 },
    compatibility_tags: ["TRAILER_STANDARD"],
    priority_class: "P1",
    source_ref: demoSource,
  },
  {
    order_id: "ORD-002",
    origin_terminal_ids: ["TRM-A"],
    destination_terminal_ids: ["TRM-B"],
    ready_at: "2026-08-13T07:30:00+09:00",
    due_at: "2026-08-13T18:00:00+09:00",
    gross_weight_kg: 20000,
    dimensions_mm: { length_mm: 13600, width_mm: 2500, height_mm: 3800 },
    compatibility_tags: ["TRAILER_STANDARD"],
    priority_class: "P1",
    source_ref: demoSource,
  },
  {
    order_id: "ORD-003",
    origin_terminal_ids: ["TRM-A"],
    destination_terminal_ids: ["TRM-B"],
    ready_at: "2026-08-13T09:00:00+09:00",
    due_at: "2026-08-13T19:00:00+09:00",
    gross_weight_kg: 23000,
    dimensions_mm: { length_mm: 13600, width_mm: 2500, height_mm: 3800 },
    compatibility_tags: ["TRAILER_STANDARD"],
    priority_class: "P2",
    source_ref: demoSource,
  },
  {
    order_id: "ORD-004",
    origin_terminal_ids: ["TRM-A"],
    destination_terminal_ids: ["TRM-B"],
    ready_at: "2026-08-13T08:30:00+09:00",
    due_at: "2026-08-13T18:00:00+09:00",
    gross_weight_kg: 21000,
    dimensions_mm: { length_mm: 13600, width_mm: 2500, height_mm: 3800 },
    compatibility_tags: ["TRAILER_STANDARD"],
    priority_class: "P3",
    source_ref: demoSource,
  },
  {
    order_id: "ORD-005",
    origin_terminal_ids: ["TRM-A"],
    destination_terminal_ids: ["TRM-B"],
    ready_at: "2026-08-13T11:00:00+09:00",
    due_at: "2026-08-13T23:00:00+09:00",
    gross_weight_kg: 19000,
    dimensions_mm: { length_mm: 13600, width_mm: 2500, height_mm: 3800 },
    compatibility_tags: ["TRAILER_STANDARD"],
    priority_class: "P2",
    adjustment_window: {
      allowed_changes: ["ADD_ORDER_APPROVED_SERVICE"],
      approval_ref: "다음 운행 SVC-NEXT-01 허용",
    },
    source_ref: demoSource,
  },
  {
    order_id: "ORD-006",
    origin_terminal_ids: ["TRM-A"],
    destination_terminal_ids: ["TRM-B"],
    ready_at: "2026-08-13T08:00:00+09:00",
    due_at: "2026-08-13T18:00:00+09:00",
    gross_weight_kg: null,
    dimensions_mm: { length_mm: 13600, width_mm: 2500, height_mm: 3800 },
    compatibility_tags: ["TRAILER_STANDARD"],
    priority_class: "P1",
    source_ref: demoSource,
  },
  {
    order_id: "ORD-007",
    origin_terminal_ids: ["TRM-A"],
    destination_terminal_ids: ["TRM-B"],
    ready_at: "2026-08-13T08:00:00+09:00",
    due_at: "2026-08-13T18:00:00+09:00",
    gross_weight_kg: 22000,
    dimensions_mm: { length_mm: 13600, width_mm: 2500, height_mm: 4300 },
    compatibility_tags: ["TRAILER_TALL"],
    priority_class: "P2",
    source_ref: demoSource,
  },
  {
    order_id: "ORD-008",
    origin_terminal_ids: ["TRM-A"],
    destination_terminal_ids: ["TRM-B"],
    ready_at: "2026-08-13T09:00:00+09:00",
    due_at: "2026-08-13T20:00:00+09:00",
    gross_weight_kg: 21000,
    dimensions_mm: { length_mm: 13600, width_mm: 2500, height_mm: 3800 },
    compatibility_tags: ["TRAILER_TALL"],
    priority_class: "P2",
    adjustment_window: {
      alternative_destination_terminal_ids: ["TRM-C"],
      allowed_changes: ["CHANGE_TO_APPROVED_TERMINAL"],
      approval_ref: "대체 터미널 TRM-C 승인",
    },
    source_ref: demoSource,
  },
  {
    order_id: "ORD-009",
    origin_terminal_ids: ["TRM-A"],
    destination_terminal_ids: ["TRM-B"],
    ready_at: "2026-08-13T08:00:00+09:00",
    due_at: "2026-08-13T15:00:00+09:00",
    gross_weight_kg: 20000,
    dimensions_mm: { length_mm: 13600, width_mm: 2500, height_mm: 3800 },
    compatibility_tags: ["TRAILER_STANDARD"],
    priority_class: "P3",
    source_ref: demoSource,
  },
];

export const terminalNames: Record<string, string> = {
  "TRM-A": "출발터미널A",
  "TRM-B": "도착터미널B",
  "TRM-C": "대체터미널C",
};