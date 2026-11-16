import { describe, expect, it } from "vitest";
import { computePnl, orderTrades } from "./pnl";
import { summarize, equityCurve } from "./stats";
import type { Trade } from "./types";

let n = 0;
const t = (side: "BUY" | "SELL", qty: number, price: number, at: string, extra: Partial<Trade> = {}): Trade => ({
  id: `t${++n}`,
  symbol: "AAPL",
  side,
  qty,
  price_usd: price,
  fee_usd: 0,
  executed_at: at,
  fx_rate: 35,
  ...extra,
});

describe("computePnl (FIFO)", () => {
  it("includes fees and converts each leg at its own FX rate", () => {
    const r = computePnl([
      t("BUY", 10, 100, "2026-01-05T15:00:00Z", { fee_usd: 1, fx_rate: 35 }),
      t("SELL", 10, 110, "2026-01-06T15:00:00Z", { fee_usd: 1, fx_rate: 36 }),
    ]);
    expect(r.closed).toHaveLength(1);
    const lot = r.closed[0];
    expect(lot.costUsd).toBeCloseTo(1001, 10);
    expect(lot.proceedsUsd).toBeCloseTo(1099, 10);
    expect(lot.pnlUsd).toBeCloseTo(98, 10);
    expect(lot.feesUsd).toBeCloseTo(2, 10);
    expect(lot.costThb).toBeCloseTo(35035, 6);
    expect(lot.proceedsThb).toBeCloseTo(39564, 6);
    expect(lot.pnlThb).toBeCloseTo(4529, 6);
    expect(r.open).toHaveLength(0);
  });

  it("matches the oldest buys first and leaves the rest open", () => {
    const r = computePnl([
      t("BUY", 10, 100, "2026-01-05T15:00:00Z"),
      t("BUY", 10, 120, "2026-01-05T16:00:00Z"),
      t("SELL", 15, 130, "2026-01-05T17:00:00Z"),
    ]);
    const pnls = r.closed.map((l) => [l.qty, l.pnlUsd]).sort((a, b) => b[0] - a[0]);
    expect(pnls).toEqual([
      [10, 300],
      [5, 50],
    ]);
    expect(r.open).toEqual([expect.objectContaining({ symbol: "AAPL", qty: 5, avgCostUsd: 120, costUsd: 600 })]);
  });

  it("handles fractional shares without float drift", () => {
    const r = computePnl([
      t("BUY", 0.3, 200.1, "2026-02-01T15:00:00Z"),
      t("SELL", 0.1, 210.2, "2026-02-01T16:00:00Z"),
    ]);
    expect(r.closed[0].pnlUsd).toBe(1.01);
    expect(r.open[0].qty).toBe(0.2);
  });

  it("treats symbols independently and case-insensitively", () => {
    const r = computePnl([
      t("BUY", 1, 10, "2026-03-01T15:00:00Z", { symbol: "tsla" }),
      t("BUY", 1, 50, "2026-03-01T15:00:00Z", { symbol: "NVDA" }),
      t("SELL", 1, 12, "2026-03-01T16:00:00Z", { symbol: "TSLA" }),
    ]);
    expect(r.closed).toEqual([expect.objectContaining({ symbol: "TSLA", pnlUsd: 2 })]);
    expect(r.open.map((o) => o.symbol)).toEqual(["NVDA"]);
  });

  it("puts a buy before a sell at the same timestamp", () => {
    const at = "2026-03-02T15:00:00Z";
    const r = computePnl([t("SELL", 1, 11, at), t("BUY", 1, 10, at)]);
    expect(r.warnings).toEqual([]);
    expect(r.closed[0].pnlUsd).toBe(1);
  });

  it("warns when selling more than is held", () => {
    const r = computePnl([t("BUY", 1, 10, "2026-03-03T15:00:00Z"), t("SELL", 3, 11, "2026-03-03T16:00:00Z")]);
    expect(r.closed).toHaveLength(1);
    expect(r.warnings).toHaveLength(1);
  });

  it("ignores share-rounding dust instead of warning or leaving a ghost position", () => {
    // ขายมากกว่าที่ซื้อ 0.0000001 หุ้น
    const over = computePnl([t("BUY", 0.1490528, 221.4, "2026-03-05T15:00:00Z"), t("SELL", 0.1490529, 230, "2026-03-06T15:00:00Z")]);
    expect(over.warnings).toEqual([]);
    expect(over.closed).toHaveLength(1);
    expect(over.open).toEqual([]);

    // ขายน้อยกว่าที่ซื้อ 0.0000002 หุ้น แล้วซื้อ-ขายรอบใหม่: เศษไม่ไปปนกับรอบถัดไป
    const under = computePnl([
      t("BUY", 1.0000002, 100, "2026-03-05T15:00:00Z"),
      t("SELL", 1, 110, "2026-03-06T15:00:00Z"),
      t("BUY", 2, 120, "2026-03-07T15:00:00Z"),
      t("SELL", 2, 125, "2026-03-08T15:00:00Z"),
    ]);
    expect(under.warnings).toEqual([]);
    expect(under.open).toEqual([]);
    expect(under.closed.map((l) => [l.qty, l.pnlUsd])).toEqual([
      [2, 10],
      [1, 10],
    ]);
  });

  it("still reports a real oversell", () => {
    const r = computePnl([t("BUY", 1, 10, "2026-03-03T15:00:00Z"), t("SELL", 1.01, 11, "2026-03-03T16:00:00Z")]);
    expect(r.warnings).toHaveLength(1);
  });

  it("uses the fallback FX rate when a trade has none", () => {
    const r = computePnl(
      [t("BUY", 1, 10, "2026-03-04T15:00:00Z", { fx_rate: null }), t("SELL", 1, 10, "2026-03-04T16:00:00Z", { fx_rate: null })],
      30,
    );
    expect(r.closed[0].costThb).toBe(300);
  });
});

describe("summarize", () => {
  it("counts one sell as one trade even when it closes several lots", () => {
    const r = computePnl([
      t("BUY", 1, 100, "2026-04-01T14:00:00Z"),
      t("BUY", 1, 102, "2026-04-01T14:30:00Z"),
      t("SELL", 2, 105, "2026-04-01T15:00:00Z"), // +5 +3 = +8, one trade
      t("BUY", 1, 100, "2026-04-02T15:00:00Z"),
      t("SELL", 1, 96, "2026-04-02T16:00:00Z"), // -4
    ]);
    const s = summarize(r.closed, "USD");
    expect(s.trades).toBe(2);
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(1);
    expect(s.winRate).toBe(0.5);
    expect(s.net).toBe(4);
    expect(s.profitFactor).toBe(2);
    expect(equityCurve(r.closed, "USD").at(-1)?.cum).toBe(4);
  });
});

describe("same-timestamp ordering by sequence number", () => {
  const at = "2026-11-11T15:00:00.000Z";
  const dime = (side: "BUY" | "SELL", qty: number, price: number, seq: number, extra: Partial<Trade> = {}) => t(side, qty, price, at, { seq, seq_cycle: 1_000_000, ...extra });

  it("pairs each sell with the buy that came before it, not one made later that day", () => {
    // ซื้อ 6 @157 → ขาย 6 @145 (ขาดทุน) → ซื้อใหม่ 4 @130 ที่ยังถืออยู่
    const r = computePnl([dime("BUY", 4, 130, 442707), dime("BUY", 6, 157, 152399), dime("SELL", 6, 145, 216209)]);
    expect(r.closed.map((l) => [l.qty, l.buyPrice, l.pnlUsd])).toEqual([[6, 157, -72]]);
    expect(r.open).toEqual([expect.objectContaining({ qty: 4, avgCostUsd: 130 })]);
    expect(r.warnings).toEqual([]);
  });

  it("starts after the widest gap when the counter wraps past 999999", () => {
    // ลำดับจริง: 982417 (ซื้อ) → วนกลับ → 007211 (ขาย)
    const r = computePnl([dime("SELL", 4, 156, 7211), dime("BUY", 4, 168, 982417)]);
    expect(r.warnings).toEqual([]);
    expect(r.closed.map((l) => l.pnlUsd)).toEqual([-48]);
    expect(orderTrades([dime("SELL", 1, 1, 7211), dime("BUY", 1, 1, 982417), dime("BUY", 1, 1, 934911)]).map((x) => x.seq)).toEqual([934911, 982417, 7211]);
  });

  it("falls back to buys-first when the sequence would sell shares not yet bought", () => {
    const r = computePnl([dime("SELL", 1, 11, 100), dime("BUY", 1, 10, 200)]);
    expect(r.warnings).toEqual([]);
    expect(r.closed[0].pnlUsd).toBe(1);
  });

  it("lets a sell of older shares come before a same-day buy", () => {
    const r = computePnl([t("BUY", 5, 100, "2026-11-10T15:00:00.000Z"), dime("BUY", 5, 80, 300), dime("SELL", 5, 90, 200)]);
    expect(r.closed.map((l) => [l.buyPrice, l.pnlUsd])).toEqual([[100, -50]]);
    expect(r.open[0].avgCostUsd).toBe(80);
  });
});
