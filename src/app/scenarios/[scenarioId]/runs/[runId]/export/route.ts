import { getExportBundle } from "@/lib/api";

/**
 * Hand the verification bundle over as a file.
 *
 * The service has always built it -- scenario, snapshot, policy, run,
 * validation, decisions and the trace -- and the screens read three fields of
 * it and dropped the rest on the floor. It is the artefact behind every
 * reproducibility claim the demo makes, and until now there was no way to take
 * it out of the browser and check one.
 *
 * Streamed straight through rather than reshaped: the hashes inside it were
 * taken over documents this app must not touch.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const bundle = await getExportBundle(runId);

  return new Response(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${runId}-export.json"`,
      "Cache-Control": "no-store",
    },
  });
}
