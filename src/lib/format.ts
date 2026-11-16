import { usMarketDay } from "./fx";
import { isDateOnlyTime } from "./importers";
import type { Currency } from "./types";

export function money(v: number, c: Currency, opts: { sign?: boolean; compact?: boolean; digits?: number } = {}) {
  const sym = c === "USD" ? "$" : "฿";
  const abs = Math.abs(v);
  const digits = opts.digits ?? (c === "USD" ? 2 : abs >= 1000 ? 0 : 2);
  const body = opts.compact && abs >= 10000
    ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(abs)
    : abs.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const sign = v < 0 ? "−" : opts.sign && v > 0 ? "+" : "";
  return `${sign}${sym}${body}`;
}

export function qty(v: number | string) {
  return Number(v).toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function price(v: number | string) {
  const n = Number(v);
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 6 : 4 });
}

export function pct(v: number) {
  return (v * 100).toFixed(1) + "%";
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

/** เวลาของรายการซื้อขาย: ถ้ามาจากไฟล์ที่มีแต่วันที่ จะแสดงแค่วันที่ (วันซื้อขายของตลาด US) ไม่แสดงเวลาที่เราสมมติขึ้น */
export function tradeTime(iso: string) {
  if (!isDateOnlyTime(iso)) return dateTime(iso);
  return new Date(usMarketDay(iso) + "T00:00:00").toLocaleDateString("th-TH", { dateStyle: "medium" });
}

export function dateOnly(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { dateStyle: "medium" });
}

export function holding(minutes: number) {
  if (minutes <= 0) return "วันเดียวกัน"; // ไฟล์ที่มีแต่วันที่: ซื้อและขายวันเดียวกัน
  if (minutes < 60) return `${minutes} นาที`;
  if (minutes < 60 * 24) return `${(minutes / 60).toFixed(1)} ชม.`;
  return `${Math.round(minutes / 1440)} วัน`;
}

export const tone = (v: number) => (v > 0 ? "text-gain" : v < 0 ? "text-loss" : "text-muted");
