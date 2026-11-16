import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import AppBackground from "@/components/AppBackground";
import { I18nProvider } from "@/i18n/client";
import { MESSAGES } from "@/i18n/messages";
import { getI18n, getLang } from "@/i18n/server";
import { APPEARANCE_BOOT_SCRIPT } from "@/lib/appearance";
import "./globals.css";

const thai = IBM_Plex_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return {
    title: m.meta.title,
    description: m.meta.description,
    appleWebApp: { capable: true, title: "Stocksme", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#d6cebf" },
    { media: "(prefers-color-scheme: dark)", color: "#282a25" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        {/* ใช้ธีม/กระจกที่บันทึกไว้ก่อนแสดงผล เพื่อไม่ให้กระพริบ */}
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOT_SCRIPT }} />
      </head>
      <body className={`${thai.variable} antialiased`}>
        {/* ส่งให้เบราว์เซอร์เฉพาะข้อความของภาษาที่ใช้อยู่ */}
        <I18nProvider lang={lang} messages={MESSAGES[lang]}>
          <AppBackground />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
