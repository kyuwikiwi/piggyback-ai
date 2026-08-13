import { redirect } from "next/navigation";

/**
 * 입력 검증은 대시보드의 ① 블록이 되었다.
 *
 * 이 경로와 `../eligibility`는 같은 검증 응답을 각자 한 번씩 POST해서 거의 같은
 * 표를 그리고 있었다. 운영자에게는 "이 주문 쓸 수 있나" 하나의 질문이다.
 * 데모 대본과 북마크에 남아 있는 주소를 위해 리다이렉트만 남긴다.
 */
export default async function ValidateRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  const { scenarioId } = await params;
  const { run } = await searchParams;

  redirect(
    `/scenarios/${encodeURIComponent(scenarioId)}${run ? `?run=${encodeURIComponent(run)}` : ""}`,
  );
}
