import type { ClosedLot } from "./pnl";
import type { Currency } from "./types";

export type Period = "today" | "week" | "month" | "year" | "all";

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

function groupRoundTripsBy(lots: ClosedLot[], c: Currency, key: (l: ClosedLot) => string | null) {
  const m = new Map<string, { key: string; pnl: number }>();
  for (const l of lots) {
    const k = key(l) ?? "(ไม่ระบุ)";
    const id = l.sellTradeId + "|" + k;
    const cur = m.get(id) ?? { key: k, pnl: 0 };
    cur.pnl += pnlOf(l, c);
    m.set(id, cur);
  }
  return [...m.values()];
}
