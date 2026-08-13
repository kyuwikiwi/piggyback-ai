export interface AltCheck {
  icon: string;
  label: string;
  detail: string;
  status: "pass" | "warn" | "fail";
}

export interface AltDetail {
  orderId: string;
  changeType: string;
  baseFail: string;
  baseDesc: string;
  altService: string;
  altDepart: string;
  altArrive: string;
  altCutoff: string;
  altTerminal?: string;
  checks: AltCheck[];
  slackBefore: string;
  slackAfter: string;
  slackWarn: boolean;
}

export const altDetails: Record<string, AltDetail> = {
  "ORD-005": {
    orderId: "ORD-005",
    changeType: "ADD_ORDER_APPROVED_SERVICE",
    baseFail: "READY_AFTER_CUTOFF",
    baseDesc: "준비 시각 11:00이 기본 운행 반입 마감 10:30 이후",
    altService: "다음 운행 (SVC-NEXT-01)",
    altDepart: "18:00",
    altArrive: "22:00",
    altCutoff: "16:30",
    checks: [
      { icon: "⏰", label: "반입 마감 통과", detail: "준비 11:00 → 마감 16:30", status: "pass" },
      { icon: "⚖️", label: "중량 적합", detail: "19t ≤ 슬롯 한도 24t", status: "pass" },
      { icon: "📐", label: "규격 적합", detail: "3,800mm ≤ 경로 한도 4,000mm", status: "pass" },
      { icon: "📅", label: "납기 충족", detail: "도착 22:00 ≤ 납기 23:00", status: "pass" },
      { icon: "🏭", label: "터미널 호환", detail: "TRM-B TRAILER_STANDARD 취급 가능", status: "pass" },
      { icon: "🚃", label: "슬롯 가용", detail: "SVC-NEXT-01 잔여 슬롯 3개", status: "pass" },
    ],
    slackBefore: "불가",
    slackAfter: "1시간",
    slackWarn: false,
  },
  "ORD-008": {
    orderId: "ORD-008",
    changeType: "CHANGE_TO_APPROVED_TERMINAL",
    baseFail: "TERMINAL_NOT_COMPATIBLE",
    baseDesc: "도착 터미널 TRM-B에서 해당 화물 유형을 취급할 수 없음",
    altService: "대체 경로 (SVC-AC-01)",
    altDepart: "14:00",
    altArrive: "18:00",
    altCutoff: "12:30",
    altTerminal: "TRM-C (대체터미널C)",
    checks: [
      { icon: "🏭", label: "터미널 호환", detail: "TRM-C에서 TRAILER_STANDARD 취급 가능", status: "pass" },
      { icon: "⏰", label: "반입 마감 통과", detail: "준비 09:00 → 마감 12:30", status: "pass" },
      { icon: "⚖️", label: "중량 적합", detail: "21t ≤ 슬롯 한도 24t", status: "pass" },
      { icon: "📐", label: "규격 적합", detail: "3,800mm ≤ 경로 한도 4,000mm", status: "pass" },
      { icon: "📅", label: "납기 충족", detail: "도착 18:00 ≤ 납기 20:00", status: "pass" },
      { icon: "🚃", label: "슬롯 가용", detail: "SVC-AC-01 잔여 슬롯 3개", status: "pass" },
    ],
    slackBefore: "불가",
    slackAfter: "2시간",
    slackWarn: false,
  },
};

export const altNoResult = [
  { orderId: "ORD-007", reason: "높이 4,300mm → 모든 경로 한도(4,000mm) 초과. 완화 불가", code: "TUNNEL_HEIGHT_EXCEEDED" },
  { orderId: "ORD-009", reason: "납기 15:00 → 가장 빠른 도착 16:00, 다음 운행도 초과. 대안 없음", code: "DUE_TIME_EXCEEDED" },
];

export const comparisonRows = [
  { item: "기준 운행", base: "SVC-AM-01 (1개)", alt: "SVC-AM-01 + SVC-NEXT-01 + SVC-AC-01", diff: "+2개 운행" },
  { item: "배정 주문", base: "3건", alt: "5건", diff: "+2건" },
  { item: "슬롯 경합 미배정", base: "1건 (ORD-004)", alt: "1건 (ORD-004)", diff: "변경 없음" },
  { item: "불가", base: "2건", alt: "2건 (ORD-007, 009)", diff: "변경 없음" },
  { item: "확인 필요", base: "1건 (ORD-006)", alt: "1건 (ORD-006)", diff: "변경 없음" },
  { item: "기존 배정 변경", base: "—", alt: "없음", diff: "유지" },
];