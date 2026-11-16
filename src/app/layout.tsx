import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import StarsBackground from "@/components/StarsBackground";
import { APPEARANCE_BOOT_SCRIPT } from "@/lib/appearance";
import "./globals.css";

const thai = IBM_Plex_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Stocksme",
  description: "บันทึกการเทรดหุ้น US — กำไรขาดทุน ทั้ง USD และบาท",
  appleWebApp: { capable: true, title: "Stocksme", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#d6cebf" },
    { media: "(prefers-color-scheme: dark)", color: "#282a25" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        {/* ใช้ธีม/กระจกที่บันทึกไว้ก่อนแสดงผล เพื่อไม่ให้กระพริบ */}
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOT_SCRIPT }} />
      </head>
      <body className={`${thai.variable} antialiased`}>
        <StarsBackground />
        {children}
      </body>
    </html>
  );
}
