import Link from "next/link";

export function Header() {
  return (
    <div className="bg-white border-b border-gray-200 px-6">
      <div className="max-w-[1060px] mx-auto flex items-center h-14">
        <Link href="/scenarios/demo" className="flex items-center gap-0.5" style={{ fontFamily: "'Poppins', sans-serif" }}>
            <span className="text-3xl font-extrabold text-[#0054a6]">Piggy</span>
            <span className="text-3xl font-extrabold text-[#00afd5]">On</span>
        </Link>
      </div>
    </div>
  );
}