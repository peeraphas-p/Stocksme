import { describe, expect, it } from "vitest";
import { totals, valuePositions } from "./prices";
import type { OpenPosition } from "./pnl";

const pos = (symbol: string, qty: number, costUsd: number, costThb: number): OpenPosition => ({
  symbol,
  qty,
  avgCostUsd: costUsd / qty,
  costUsd,
  costThb,
  firstBuyAt: "2026-11-01T15:00:00Z",
});
const q = (price: number, prevClose: number | null = null) => ({ price, prevClose, time: "2026-11-13T21:00:00Z", currency: "USD" });

describe("valuePositions", () => {
  it("values holdings at the latest price, THB at today's rate", () => {
    const [v] = valuePositions([pos("NVDA", 10, 1800, 60000)], { NVDA: q(200, 195) }, 33);
    expect(v.marketUsd).toBe(2000);
    expect(v.unrealizedUsd).toBe(200);
    expect(v.unrealizedThb).toBe(2000 * 33 - 60000);
    expect(v.unrealizedPct).toBeCloseTo(200 / 1800, 12);
    expect(v.dayChangeUsd).toBe(50);
  });

  it("leaves unpriced holdings and options without a value", () => {
    const v = valuePositions([pos("ZZZZ", 1, 10, 330), pos("AMZN270115C00250000", 1, 20, 660)], { AMZN270115C00250000: q(30) }, 33);
    expect(v.map((x) => x.marketUsd)).toEqual([null, null]);
    expect(totals(v)).toMatchObject({ priced: 0, total: 2, marketUsd: 0 });
  });

  it("sums priced holdings", () => {
    const t = totals(valuePositions([pos("A", 1, 10, 330), pos("B", 2, 20, 660)], { A: q(12, 11), B: q(9) }, 33));
    expect(t).toMatchObject({ priced: 2, marketUsd: 30, unrealizedUsd: 0, dayChangeUsd: 1 });
  });
});
