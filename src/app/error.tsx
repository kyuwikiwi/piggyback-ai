"use client";

import Link from "next/link";

import { Alert, Header } from "@/components/ui";

/**
 * The API client throws rather than falling back to fixture data, so a failed
 * call lands here. Showing what broke is the point -- a planning screen that
 * renders a plausible page after the service refused the request is worse than
 * one that stops.
 *
 * React strips error messages in production builds and leaves only `digest`;
 * that digest matches a server log line. In dev the message comes through.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header />
      <main className="max-w-[1060px] mx-auto px-6 py-12 flex flex-col gap-5">
        <h1 className="text-2xl font-bold text-gray-900">요청이 처리되지 않았습니다</h1>

        <Alert type="error">
          <code className="text-xs font-mono break-all">
            {error.message || "서버에서 자세한 내용을 반환하지 않았습니다."}
          </code>
          {error.digest && (
            <>
              <br />
              <span className="text-xs text-gray-400">digest {error.digest}</span>
            </>
          )}
        </Alert>

        <p className="text-sm text-gray-500 leading-7">
          백엔드가 떠 있는지, <code className="font-mono">.env.local</code>의{" "}
          <code className="font-mono">API_BASE_URL</code>이 맞는지 확인하세요. 인메모리
          저장소를 쓰는 경우 서버를 재시작하면 이전 시나리오와 실행은 사라지므로, 새
          시나리오를 시작해야 합니다.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="h-10 px-5 rounded-full bg-korail-blue text-white text-sm font-semibold hover:bg-[#004080]"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="h-10 px-5 rounded-full border border-gray-300 text-sm font-semibold text-gray-600 flex items-center hover:bg-gray-100"
          >
            새 시나리오 시작
          </Link>
        </div>
      </main>
    </div>
  );
}
