import { redirect } from "next/navigation";

/** 후보 검토는 편성 탭과 타임라인 탭으로 나뉘었다. 시각으로 걸린 건이 전자, 아닌 건이 후자다. */
export default async function EligibilityRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ scenarioId: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  const { scenarioId } = await params;
  const { run } = await searchParams;

  redirect(
    `/scenarios/${encodeURIComponent(scenarioId)}/timeline${run ? `?run=${encodeURIComponent(run)}` : ""}`,
  );
}
