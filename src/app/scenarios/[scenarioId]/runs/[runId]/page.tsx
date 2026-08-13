import { redirect } from "next/navigation";

/** 기본 편성은 대시보드의 ③ 블록이 되었다. */
export default async function RunRedirect({
  params,
}: {
  params: Promise<{ scenarioId: string; runId: string }>;
}) {
  const { scenarioId, runId } = await params;

  redirect(`/scenarios/${encodeURIComponent(scenarioId)}?run=${encodeURIComponent(runId)}`);
}
