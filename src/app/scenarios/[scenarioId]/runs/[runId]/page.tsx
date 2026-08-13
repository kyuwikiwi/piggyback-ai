import { redirect } from "next/navigation";

/** 기본 편성은 시나리오의 편성 탭이다. */
export default async function RunRedirect({
  params,
}: {
  params: Promise<{ scenarioId: string; runId: string }>;
}) {
  const { scenarioId, runId } = await params;

  redirect(`/scenarios/${encodeURIComponent(scenarioId)}?run=${encodeURIComponent(runId)}`);
}
