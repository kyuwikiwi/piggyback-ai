import { redirect } from "next/navigation";

/** 후보 검토는 대시보드의 ② 타임라인과 ③ 편성 블록이 되었다. */
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
    `/scenarios/${encodeURIComponent(scenarioId)}${run ? `?run=${encodeURIComponent(run)}` : ""}`,
  );
}
