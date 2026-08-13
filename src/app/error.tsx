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

/**
 * What actually went wrong, in the words that fit it.
 *
 * Every failure used to read "check the backend is running", including a
 * scenario id that simply does not exist. That sends the reader to restart a
 * service that is working fine, and buries the one sentence that would have
 * helped.
 */
function diagnose(message: string): { title: string; advice: string } {
  if (/SCENARIO_NOT_FOUND|RUN_NOT_FOUND|404/.test(message)) {
    return {
      title: "그런 시나리오가 없습니다",
      advice:
        "주소의 id를 확인하세요. 인메모리 저장소를 쓰는 경우 서버를 재시작하면 이전 시나리오와 실행은 사라집니다 — 그때는 목록에서 다른 시나리오를 고르거나 새로 시작하면 됩니다.",
    };
  }

  if (/fetch failed|ECONNREFUSED|API_BASE_URL/i.test(message)) {
    return {
      title: "백엔드에 연결할 수 없습니다",
      advice:
        "백엔드 저장소에서 uvicorn을 실행하고, .env.local의 API_BASE_URL이 그 주소를 가리키는지 확인하세요. 백엔드 없이 그럴듯한 결과를 그리지는 않습니다.",
    };
  }

  if (/VALIDATION_REQUIRED|POLICY_VIOLATION|RUN_NOT_ACCEPTABLE|INVALID_INPUT/.test(message)) {
    return {
      title: "서비스가 요청을 거절했습니다",
      advice:
        "규칙에 걸린 요청입니다. 아래 사유 코드가 어떤 규칙인지 알려줍니다 — 화면을 새로 고쳐도 같은 답이 옵니다.",
    };
  }

  return {
    title: "요청이 처리되지 않았습니다",
    advice:
      "잠시 뒤 다시 시도하고, 계속되면 백엔드 로그를 확인하세요. 아래 값이 그 로그의 한 줄과 맞춰집니다.",
  };
}

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { title, advice } = diagnose(error.message ?? "");

  return (
    <div className="min-h-screen bg-canvas font-sans">
      <Header width="narrow" />
      <main className="max-w-[860px] mx-auto px-6 py-12 flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>

        <p className="text-sm text-ink-2 leading-6">{advice}</p>

        <Alert type="error">
          <code className="text-[13px] font-mono break-all">
            {error.message || "서버에서 자세한 내용을 반환하지 않았습니다."}
          </code>
        </Alert>

        <div className="flex gap-2">
          <button type="button" onClick={reset} className="btn btn-primary">
            다시 시도
          </button>
          <Link href="/" className="btn">
            시나리오 목록
          </Link>
        </div>

        {/* Kept, because a production build strips the message and this is the
            only handle onto the server log line -- but out of the way, since it
            is for whoever reads that log and not for whoever hit the error. */}
        {error.digest && (
          <p className="text-[13px] text-ink-3 font-mono">digest {error.digest}</p>
        )}
      </main>
    </div>
  );
}
