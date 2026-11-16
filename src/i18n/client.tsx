"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useTransition } from "react";
import { LANG_COOKIE, type Lang } from "./config";
import { makeI18n, type I18n } from "./core";
import type { Messages } from "./messages/th";

type Ctx = I18n & { setLang: (lang: Lang) => void; switching: boolean };
const I18nContext = createContext<Ctx | null>(null);

/** ได้ภาษาและข้อความของภาษานั้นจาก root layout (server) — ส่งมาเฉพาะภาษาที่ใช้อยู่ */
export function I18nProvider({ lang, messages, children }: { lang: Lang; messages: Messages; children: React.ReactNode }) {
  const router = useRouter();
  const [switching, start] = useTransition();
  const base = useMemo(() => makeI18n(lang, messages), [lang, messages]);

  const setLang = useCallback(
    (next: Lang) => {
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
      // ให้ server ส่งข้อความของภาษาใหม่มา โดยไม่ต้องโหลดหน้าใหม่ทั้งหมด
      start(() => router.refresh());
    },
    [router],
  );

  const value = useMemo(() => ({ ...base, setLang, switching }), [base, setLang, switching]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const v = useContext(I18nContext);
  if (!v) throw new Error("useI18n must be used inside <I18nProvider>");
  return v;
}
