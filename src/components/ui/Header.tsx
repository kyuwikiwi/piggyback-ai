import Link from "next/link";

export interface HeaderProps {
  /** Where the logo goes. Defaults to the landing page, which starts a scenario. */
  href?: string;
}

export function Header({ href = "/" }: HeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6">
      <div className="max-w-[1060px] mx-auto flex items-center h-14">
        <Link
          href={href}
          className="flex items-center gap-0.5"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          <span className="text-3xl font-extrabold text-[#0054a6]">Piggy</span>
          <span className="text-3xl font-extrabold text-[#00afd5]">On</span>
        </Link>
      </div>
    </div>
  );
}
