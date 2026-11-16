import { fill, localeOf, type Lang } from "./config";
import type { Messages } from "./messages/th";

/** วันที่ (YYYY-MM-DD) ตามเวลานิวยอร์ก — วันซื้อขายของตลาด US */
const nyDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(iso));
const nyClock = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit" });
/** รายการจากไฟล์ที่มีแต่วันที่ ถูกวางไว้ 10:00:00.000 เวลานิวยอร์ก (ต้องตรงกับ importers) */
function isDateOnly(iso: string) {
  const d = new Date(iso);
  if (d.getMilliseconds() !== 0) return false;
  const p = nyClock.formatToParts(d);
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return g("hour") === 10 && g("minute") === 0 && g("second") === 0;
}

/** ตัวจัดรูปแบบที่ขึ้นกับภาษา (วันที่ ระยะเวลาถือ ชื่อวัน/เดือน) */
export function formatters(locale: string, m: Messages) {
  const dt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const d = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const dayMonth = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const monthYear = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const monthShort = new Intl.DateTimeFormat(locale, { month: "short" });
  const full = new Intl.DateTimeFormat(locale, { dateStyle: "full" });
  const wdShort = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const wdLong = new Intl.DateTimeFormat(locale, { weekday: "long" });
  // 2023-01-01 เป็นวันอาทิตย์ → วันที่ 1+i คือวันในสัปดาห์ที่ i (0 = อาทิตย์)
  const weekdayDate = (i: number) => new Date(Date.UTC(2023, 0, 1 + i, 12));
  const local = (day: string) => new Date(day + "T00:00:00");
  return {
    dateTime: (iso: string) => dt.format(new Date(iso)),
    /** วันที่ YYYY-MM-DD (ไม่มีเวลา) */
    day: (day: string) => d.format(local(day)),
    dayFull: (day: string) => full.format(local(day)),
    dayMonth: (day: string) => dayMonth.format(local(day)),
    monthYear: (date: Date) => monthYear.format(date),
    monthShort: (month0: number) => monthShort.format(new Date(2023, month0, 15)),
    /** เวลาของรายการ: ถ้ามาจากไฟล์ที่มีแต่วันที่ แสดงแค่วันซื้อขายของตลาด US */
    tradeTime: (iso: string) => (isDateOnly(iso) ? d.format(local(nyDay(iso))) : dt.format(new Date(iso))),
    weekdayShort: (i: number) => wdShort.format(weekdayDate(i)),
    weekdayLong: (i: number) => wdLong.format(weekdayDate(i)),
    holding: (minutes: number) => {
      if (minutes <= 0) return m.holding.sameDay;
      if (minutes < 60) return fill(m.holding.minutes, { n: minutes });
      if (minutes < 60 * 24) return fill(m.holding.hours, { n: (minutes / 60).toFixed(1) });
      return fill(m.holding.days, { n: Math.round(minutes / 1440) });
    },
  };
}

export type Formatters = ReturnType<typeof formatters>;

export interface I18n {
  lang: Lang;
  locale: string;
  m: Messages;
  /** เติมค่าในข้อความ เช่น t(m.trades.tabOpen, { n: 3 }) */
  t: typeof fill;
  fmt: Formatters;
}

export function makeI18n(lang: Lang, m: Messages): I18n {
  const locale = localeOf(lang);
  return { lang, locale, m, t: fill, fmt: formatters(locale, m) };
}

/** ชื่ออารมณ์ที่แสดง (ค่าที่เก็บในฐานข้อมูลเป็นภาษาไทยเสมอ) — ค่าที่ไม่รู้จักแสดงตามที่เก็บไว้ */
export function emotionLabel(m: Messages, value: string) {
  return (m.emotions as Record<string, string>)[value] ?? value;
}
