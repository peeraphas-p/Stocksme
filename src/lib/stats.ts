import type { ClosedLot } from "./pnl";
import type { Currency } from "./types";

export type Period = "today" | "week" | "month" | "year" | "all";

/** key ของกลุ่มที่ไม่ได้ระบุค่า (เช่น ไม่ได้ใส่กลยุทธ์) — หน้าเว็บแสดงเป็น common.unspecified */
export const NONE_KEY = "__none__";

/** YYYY-MM-DD ตามเวลาเครื่อง */
export function localDay(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function periodStart(period: Period, now = new Date()): Date | null {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case "today":
      return d;
    case "week": {
      const dow = (d.getDay() + 6) % 7; // จันทร์ = 0
      d.setDate(d.getDate() - dow);
      return d;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null;
  }
}

export function filterByPeriod(lots: ClosedLot[], period: Period, now = new Date()): ClosedLot[] {
  const start = periodStart(period, now);
  if (!start) return lots;
  return lots.filter((l) => new Date(l.sellAt) >= start);
}

export const pnlOf = (l: ClosedLot, c: Currency) => (c === "USD" ? l.pnlUsd : l.pnlThb);

/** รวม lot ตามการขายแต่ละครั้ง = "1 เทรด" สำหรับคิด win rate */
export function roundTrips(lots: ClosedLot[], c: Currency) {
  const map = new Map<string, { sellTradeId: string; symbol: string; sellAt: string; pnl: number }>();
  for (const l of lots) {
    const cur = map.get(l.sellTradeId);
    if (cur) cur.pnl += pnlOf(l, c);
    else map.set(l.sellTradeId, { sellTradeId: l.sellTradeId, symbol: l.symbol, sellAt: l.sellAt, pnl: pnlOf(l, c) });
  }
  return [...map.values()];
}

export interface Summary {
  net: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number | null;
  best: number;
  worst: number;
  feesUsd: number;
}

export function summarize(lots: ClosedLot[], c: Currency): Summary {
  const rts = roundTrips(lots, c);
  const wins = rts.filter((r) => r.pnl > 0);
  const losses = rts.filter((r) => r.pnl < 0);
  const grossWin = wins.reduce((s, r) => s + r.pnl, 0);
  const grossLoss = losses.reduce((s, r) => s + r.pnl, 0);
  return {
    net: rts.reduce((s, r) => s + r.pnl, 0),
    trades: rts.length,
    wins: wins.length,
    losses: losses.length,
    winRate: rts.length ? wins.length / rts.length : 0,
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
    profitFactor: grossLoss < 0 ? grossWin / Math.abs(grossLoss) : null,
    best: rts.length ? Math.max(...rts.map((r) => r.pnl)) : 0,
    worst: rts.length ? Math.min(...rts.map((r) => r.pnl)) : 0,
    feesUsd: lots.reduce((s, l) => s + l.feesUsd, 0),
  };
}

/** กำไรสุทธิรายวัน */
export function dailyPnl(lots: ClosedLot[], c: Currency): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of lots) {
    const k = localDay(l.sellAt);
    m.set(k, (m.get(k) ?? 0) + pnlOf(l, c));
  }
  return m;
}

export function equityCurve(lots: ClosedLot[], c: Currency) {
  const days = [...dailyPnl(lots, c).entries()].sort(([a], [b]) => a.localeCompare(b));
  let cum = 0;
  return days.map(([day, pnl]) => {
    cum += pnl;
    return { day, pnl, cum };
  });
}

export function groupPnl(lots: ClosedLot[], c: Currency, key: (l: ClosedLot) => string | null) {
  const m = new Map<string, { key: string; pnl: number; count: number; wins: number }>();
  for (const rt of groupRoundTripsBy(lots, c, key)) {
    const cur = m.get(rt.key) ?? { key: rt.key, pnl: 0, count: 0, wins: 0 };
    cur.pnl += rt.pnl;
    cur.count += 1;
    if (rt.pnl > 0) cur.wins += 1;
    m.set(rt.key, cur);
  }
  return [...m.values()].sort((a, b) => b.pnl - a.pnl);
}

/**
 * 1 การขาย = 1 เทรด: ถ้าการขายครั้งเดียวปิดหลายล็อตที่อยู่คนละกลุ่ม (เช่น ซื้อคนละวัน)
 * ให้นับทั้งเทรดไว้ในกลุ่มของล็อตที่ใหญ่ที่สุด (ตามทุน) — จำนวนเทรดรวมจึงเท่ากับจำนวนการขาย และกำไรรวมไม่เปลี่ยน
 */
function groupRoundTripsBy(lots: ClosedLot[], c: Currency, key: (l: ClosedLot) => string | null) {
  const trips = new Map<string, { pnl: number; key: string; weight: number }>();
  for (const l of lots) {
    const cur = trips.get(l.sellTradeId) ?? { pnl: 0, key: "", weight: -1 };
    cur.pnl += pnlOf(l, c);
    if (l.costUsd > cur.weight) {
      cur.weight = l.costUsd;
      cur.key = key(l) ?? NONE_KEY;
    }
    trips.set(l.sellTradeId, cur);
  }
  return [...trips.values()].map(({ key, pnl }) => ({ key, pnl }));
}

export interface RSummary {
  /** จำนวนเทรด (การขาย) ที่ตั้ง stop ไว้ */
  planned: number;
  total: number;
  /** กำไรรวม ÷ ความเสี่ยงรวม ของเทรดที่ตั้ง stop */
  avgR: number | null;
  /** เทรดที่ขาดทุนเกินแผน (แย่กว่า −1R) */
  overLoss: number;
  /** เทรดที่ได้ 2R ขึ้นไป */
  bigWins: number;
}

/** สรุปวินัยตามแผน: รวม lot ของการขายแต่ละครั้งเป็น 1 เทรด */
export function rSummary(lots: ClosedLot[]): RSummary {
  const trips = new Map<string, { pnl: number; risk: number; planned: boolean }>();
  for (const l of lots) {
    const cur = trips.get(l.sellTradeId) ?? { pnl: 0, risk: 0, planned: false };
    if (l.riskUsd != null) {
      cur.pnl += l.pnlUsd;
      cur.risk += l.riskUsd;
      cur.planned = true;
    }
    trips.set(l.sellTradeId, cur);
  }
  const planned = [...trips.values()].filter((t) => t.planned && t.risk > 0);
  const pnl = planned.reduce((s, t) => s + t.pnl, 0);
  const risk = planned.reduce((s, t) => s + t.risk, 0);
  return {
    planned: planned.length,
    total: trips.size,
    avgR: risk > 0 ? pnl / risk : null,
    overLoss: planned.filter((t) => t.pnl / t.risk < -1.05).length,
    bigWins: planned.filter((t) => t.pnl / t.risk >= 2).length,
  };
}

/** ช่วงของ R สำหรับรายงาน เป็นรหัส "1"–"6" (เรียงลำดับได้) — หน้าเว็บแปลงเป็นข้อความ reports.r1–r6 */
export function rBucket(r: number | null): string {
  if (r == null) return "6";
  if (r < -1.05) return "1";
  if (r < 0) return "2";
  if (r < 1) return "3";
  if (r < 2) return "4";
  return "5";
}

export interface YearRow {
  year: string;
  trades: number;
  wins: number;
  grossWinUsd: number;
  grossLossUsd: number;
  netUsd: number;
  netThb: number;
  costThb: number;
  proceedsThb: number;
  feesUsd: number;
}

/** สรุปไม้ที่ปิดแล้วรายปี (ตามปีของวันขาย, เวลาเครื่อง) — ใหม่สุดก่อน */
export function yearlySummary(lots: ClosedLot[]): YearRow[] {
  const byYear = new Map<string, ClosedLot[]>();
  for (const l of lots) {
    const y = localDay(l.sellAt).slice(0, 4);
    byYear.set(y, [...(byYear.get(y) ?? []), l]);
  }
  return [...byYear.entries()]
    .map(([year, ls]) => {
      const trips = roundTrips(ls, "USD");
      return {
        year,
        trades: trips.length,
        wins: trips.filter((t) => t.pnl > 0).length,
        grossWinUsd: trips.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0),
        grossLossUsd: trips.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0),
        netUsd: ls.reduce((s, l) => s + l.pnlUsd, 0),
        netThb: ls.reduce((s, l) => s + l.pnlThb, 0),
        costThb: ls.reduce((s, l) => s + l.costThb, 0),
        proceedsThb: ls.reduce((s, l) => s + l.proceedsThb, 0),
        feesUsd: ls.reduce((s, l) => s + l.feesUsd, 0),
      };
    })
    .sort((a, b) => b.year.localeCompare(a.year));
}

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV ของไม้ที่ปิดในปีนั้น พร้อมอัตราแลกเปลี่ยนที่ใช้ (ไว้ให้นักบัญชี/ตรวจเอง) */
export function yearCsv(lots: ClosedLot[], year: string): string {
  const cols = [
    "symbol", "qty", "buy_date", "sell_date", "buy_price_usd", "sell_price_usd", "cost_usd", "proceeds_usd", "fees_usd", "pnl_usd",
    "fx_buy_thb_per_usd", "fx_sell_thb_per_usd", "cost_thb", "proceeds_thb", "pnl_thb", "note",
  ];
  const rows = lots
    .filter((l) => localDay(l.sellAt).startsWith(year))
    .sort((a, b) => a.sellAt.localeCompare(b.sellAt))
    .map((l) =>
      [
        l.symbol, l.qty, localDay(l.buyAt), localDay(l.sellAt), l.buyPrice, l.sellPrice,
        l.costUsd.toFixed(2), l.proceedsUsd.toFixed(2), l.feesUsd.toFixed(2), l.pnlUsd.toFixed(2),
        l.costUsd ? (l.costThb / l.costUsd).toFixed(4) : "", l.proceedsUsd ? (l.proceedsThb / l.proceedsUsd).toFixed(4) : "",
        l.costThb.toFixed(2), l.proceedsThb.toFixed(2), l.pnlThb.toFixed(2), l.expired ? "option expired worthless" : "",
      ].map(csvCell).join(","),
    );
  return [cols.join(","), ...rows].join("\n");
}
