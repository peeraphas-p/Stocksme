// ตัวจัดรูปแบบตัวเลข/เงินที่ไม่ขึ้นกับภาษา — วันที่และระยะเวลาอยู่ใน src/i18n/core.ts (formatters)
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

export const tone = (v: number) => (v > 0 ? "text-gain" : v < 0 ? "text-loss" : "text-muted");
