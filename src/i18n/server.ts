import { cookies, headers } from "next/headers";
import { countryFromHeaders, isLang, LANG_COOKIE, pickLang, type Lang } from "./config";
import { makeI18n } from "./core";
import { MESSAGES } from "./messages";

/** ภาษาของคำขอนี้: ภาษาที่ผู้ใช้เลือกไว้ (คุกกี้) ไม่อย่างนั้นเลือกจากประเทศที่เข้าเว็บ */
export async function getLang(): Promise<Lang> {
  const chosen = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(chosen)) return chosen;
  const h = await headers();
  return pickLang({ country: countryFromHeaders((n) => h.get(n)), acceptLanguage: h.get("accept-language") });
}

/** ใช้ใน server component */
export async function getI18n() {
  const lang = await getLang();
  return makeI18n(lang, MESSAGES[lang]);
}
