import { redirect } from "next/navigation";

/**
 * 대안은 화면이 아니라 주문 하나에 대한 동작이 되었다.
 *
 * 예전 흐름은 편성 화면에서 미배정 주문을 보다가, 이 화면으로 넘어와서, 같은
 * 주문을 다시 고르는 것이었다. 이제 대시보드에서 주문을 열고 그 자리에서
 * 실행하며, 파생 계획은 같은 페이지 아래에 그려진다.
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

  const selection = order
    ? `&order=${encodeURIComponent(order)}&alt=${encodeURIComponent(order)}`
    : "";

  redirect(
    `/scenarios/${encodeURIComponent(scenarioId)}?run=${encodeURIComponent(runId)}${selection}`,
  );
}
