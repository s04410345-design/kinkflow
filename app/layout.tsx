import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FDFBF7",
};

export const metadata: Metadata = {
  manifest: "/manifest.json",
  title: "秋Day ── ChillDay Kink Flow | 和風心靈與 BDSM 探索學堂",
  description:
    "秋Day (ChillDay Kink Flow) 是一個安心、放鬆且匿名的 BDSM 知識探索平台。透過互動式和風心智圖、多維度傾向測驗與 AI 導師，幫助你在 Chill 的氛圍中認識自我。",
  keywords: ["秋Day", "ChillDay", "KinkFlow", "BDSM測驗", "和風知識圖", "SSC", "安全詞"],
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "秋Day ── ChillDay Kink Flow | 和風心靈與 BDSM 探索學堂",
    description:
      "透過互動式和風心智圖與 AI 導師，在安心 Chill 的環境中探索 BDSM 文化。",
    siteName: "KinkFlow",
    type: "website",
    locale: "zh_TW",
  },
  twitter: {
    card: "summary_large_image",
    title: "KinkFlow — BDSM 探索與教學互動平台",
    description:
      "透過互動式知識網絡圖與 AI 導師，在安全的環境中探索 BDSM 文化。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
