/**
 * Shown while the scenario, its validation and its run are being fetched.
 *
 * These pages render on the server and the solver is allowed ten seconds, so
 * without this the browser sits on the previous page with nothing moving. A
 * live site that pauses for ten seconds after a click does not read as working.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas font-sans">
      <div className="max-w-[1180px] mx-auto px-6 py-10 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-line-strong border-t-korail-blue animate-spin" />
          <span className="text-sm text-ink-2">
            시나리오를 불러오고 편성 결과를 계산하고 있습니다
          </span>
        </div>

        {/* 화면이 실제로 그리는 모양과 같은 자리를 잡아 둔다 -- 요약 한 줄,
            타임라인, 편성. */}
        <div className="h-14 rounded-lg border border-line bg-white animate-pulse" aria-hidden="true" />
        <div className="h-52 rounded-lg border border-line bg-white animate-pulse" aria-hidden="true" />
        <div className="h-72 rounded-lg border border-line bg-white animate-pulse" aria-hidden="true" />
      </div>
    </div>
  );
}
