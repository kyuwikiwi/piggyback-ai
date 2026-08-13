import type { ValidationReport } from "@/types";

export const validationReport: ValidationReport = {
  scenario_id: "SCN-DEMO-001",
  total_orders: 9,
  valid_count: 8,
  review_required_count: 1,
  issues: [
    {
      order_id: "ORD-006",
      field: "gross_weight_kg",
      code: "MISSING_REQUIRED_FIELD",
      message: "총중량(gross_weight_kg)이 누락되어 규격 적합성을 판정할 수 없습니다. 이 주문은 계산에서 분리됩니다.",
      severity: "ERROR",
    },
  ],
  created_at: "2026-08-13T10:00:00+09:00",
};