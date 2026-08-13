/**
 * Shown while the scenario, its validation and its run are being fetched.
 *
 * These pages render on the server and the solver is allowed ten seconds, so
 * without this the browser sits on the previous page with nothing moving. A
 * live site that pauses for ten seconds after a click does not read as working.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="max-w-[1180px] mx-auto px-6 py-16 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-korail-blue animate-spin" />
          <span className="text-sm text-gray-500">
            시나리오를 불러오고 편성 결과를 계산하고 있습니다
          </span>
        </div>

        <div className="flex flex-wrap gap-4" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex-1 min-w-[90px] h-24 rounded-xl bg-gray-200 animate-pulse" />
          ))}
        </div>
        <div className="h-56 rounded-xl bg-gray-200 animate-pulse" aria-hidden="true" />
        <div className="h-72 rounded-xl bg-gray-200 animate-pulse" aria-hidden="true" />
      </div>
    </div>
  );
}
