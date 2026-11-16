/** ภาษาที่รองรับ — อังกฤษเป็นภาษาหลัก, ไทยสำหรับผู้ใช้ในประเทศไทย */
export const LANGS = [
  { code: "en", name: "English", flag: "US", locale: "en-US" },
  { code: "th", name: "ไทย", flag: "TH", locale: "th-TH" },
] as const;

export type Lang = (typeof LANGS)[number]["code"];
export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "stocksme-lang";

export const isLang = (v: unknown): v is Lang => LANGS.some((l) => l.code === v);
export const localeOf = (lang: Lang) => LANGS.find((l) => l.code === lang)!.locale;

/**
 * ภาษาตอนเข้าเว็บครั้งแรก (ยังไม่เคยเลือก):
 * อยู่ในไทย → ไทย, อยู่ประเทศอื่น → อังกฤษ.
 * ถ้าไม่รู้ประเทศ (เช่น รันบนเครื่องตัวเอง) ใช้ภาษาแรกของเบราว์เซอร์: ไทยถ้าเป็น th ไม่อย่างนั้นอังกฤษ
 */
export function pickLang({ country, acceptLanguage }: { country?: string | null; acceptLanguage?: string | null }): Lang {
  const c = country?.trim().toUpperCase();
  if (c && /^[A-Z]{2}$/.test(c) && c !== "XX") return c === "TH" ? "th" : "en";
  const first = acceptLanguage?.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.split("-")[0] === "th" ? "th" : DEFAULT_LANG;
}

/** รหัสประเทศของผู้เข้าชมจาก header ของโฮสต์ (Netlify; Cloudflare ถ้ามีอยู่ด้านหน้า) */
export function countryFromHeaders(get: (name: string) => string | null): string | null {
  const direct = get("x-country") ?? get("x-nf-country") ?? get("cf-ipcountry");
  if (direct) return direct;
  const geo = get("x-nf-geo"); // base64 JSON: {"country":{"code":"TH",...},...}
  if (!geo) return null;
  try {
    const json = JSON.parse(typeof atob === "function" ? atob(geo) : Buffer.from(geo, "base64").toString("utf8"));
    return typeof json?.country?.code === "string" ? json.country.code : null;
  } catch {
    return null;
  }
}

/** แทนค่า {ชื่อ} ในข้อความ */
export function fill(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (all, k: string) => (k in vars ? String(vars[k]) : all));
}
