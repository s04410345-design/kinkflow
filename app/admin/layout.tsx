import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KinkFlow 管理後台",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
