import Link from "next/link";

export interface HeaderProps {
  /** Where the logo goes. Defaults to the landing page, which starts a scenario. */
  href?: string;
  /**
   * 이 페이지 본문의 최대 폭.
   *
   * 앱 바는 늘 1180px에 맞춰 있었고 랜딩은 860px이라, 로고가 본문 왼쪽 끝보다
   * 160px 바깥에 떠 있었다. 페이지마다 폭이 다른 건 의도된 것이니(표는 넓게,
   * 글과 폼은 좁게) 바가 그 폭을 따라간다.
   */
  width?: "wide" | "narrow";
}

/**
 * 앱 바.
 *
 * 워드마크는 두 색을 쓰는 유일한 자리다 — 로고니까. 크기는 줄였다. 이 줄 바로
 * 아래에 시나리오 머리말이 또 오는데, 로고가 30px면 화면에서 제일 큰 글자가
 * 제품 이름이 되어 정작 보고 있는 시나리오 번호보다 커진다.
 */
export function Header({ href = "/", width = "wide" }: HeaderProps) {
  return (
    <div className="border-b border-line bg-white px-6">
      <div
        className={`${width === "wide" ? "max-w-[1180px]" : "max-w-[860px]"} mx-auto flex items-center h-14`}
      >
        <Link href={href} className="flex items-center font-display leading-none">
          <span className="text-2xl font-extrabold text-korail-blue">Piggy</span>
          <span className="text-2xl font-extrabold text-korail-light">On</span>
        </Link>
      </div>
    </div>
  );
}
