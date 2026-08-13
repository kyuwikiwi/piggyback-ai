import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The wordmark. Loaded through next/font like the others rather than a <link>
// in <head>, which only applied to the page that rendered it.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "PiggyOn — 철도 슬롯 편성",
    template: "%s · PiggyOn",
  },
  description:
    "주문을 편성 가능·확인 필요·불가로 판정하고, 불가한 주문은 무엇을 바꾸면 다시 검토할 수 있는지 보여줍니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
