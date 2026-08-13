import { redirect } from "next/navigation";

/**
 * 대안은 화면이 아니라 주문 하나에 대한 동작이다.
 *
 * 예전 흐름은 편성 화면에서 미배정 주문을 보다가, 이 화면으로 넘어와서, 같은
 * 주문을 다시 고르는 것이었다. 이제 두 자리에서 시작한다 -- 편성 탭에서 주문을
 * 열면 옆 패널에서, 그리고 AI 탭에서 제안 목록째로. 후자로 보낸다: 주문을 지정하지
 * 않고 이 주소로 온 사람은 "무엇을 해볼 수 있나"를 묻고 있는 것이다.
 */
export default async function AlternativesRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string; runId: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { scenarioId, runId } = await params;
  const { order } = await searchParams;

  const base = `/scenarios/${encodeURIComponent(scenarioId)}`;

  redirect(
    order
      ? `${base}?run=${encodeURIComponent(runId)}&order=${encodeURIComponent(order)}`
      : `${base}/ai?run=${encodeURIComponent(runId)}`,
  );
}
