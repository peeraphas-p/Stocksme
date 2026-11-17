import { describe, expect, it } from "vitest";
import { buildAiContext } from "./ai-context";
import { computePnl } from "./pnl";
import type { Trade } from "./types";

let n = 0;
const t = (symbol: string, side: "BUY" | "SELL", qty: number, price: number, at: string, extra: Partial<Trade> = {}): Trade => ({
  id: `t${++n}`,
  symbol,
  side,
  qty,
  price_usd: price,
  fee_usd: 1,
  executed_at: at,
  fx_rate: 35,
  ...extra,
});

describe("buildAiContext", () => {
  const pnl = computePnl([
    t("NVDA", "BUY", 10, 100, "2026-11-02T15:00:00Z", { strategy_tag: "Breakout" }),
    t("NVDA", "SELL", 10, 110, "2026-11-03T15:00:00Z"),
    t("AMD", "BUY", 5, 50, "2026-11-04T15:00:00Z", { emotion: "FOMO" }),
    t("AMD", "SELL", 5, 40, "2026-11-05T15:00:00Z"),
    t("MSFT", "BUY", 2, 400, "2026-11-06T15:00:00Z"),
  ]);
  const text = buildAiContext({
    now: new Date("2026-11-17T12:00:00Z"),
    closed: pnl.closed,
    open: pnl.open,
    latestFx: 33.5,
    journal: [{ id: "j1", entry_date: "2026-11-05", symbol: "AMD", strategy_tag: null, emotion: "FOMO", plan: "chase", result: null, lesson: "wait for a setup", rating: 2 }],
  });

  it("summarizes realized results net of fees", () => {
    // NVDA +98 (1100-1-1001), AMD -52 (200-1-251)
    expect(text).toContain("All time: net $46.00");
    expect(text).toContain("2 trades, win rate 50.0% (1W/1L)");
    expect(text).toContain("- NVDA: $98.00, 1 trades, 1 wins");
    expect(text).toContain("- AMD: -$52.00, 1 trades, 0 wins");
  });

  it("groups by strategy and emotion and lists open positions and journal notes", () => {
    expect(text).toContain("- Breakout: $98.00");
    expect(text).toContain("- FOMO: -$52.00");
    expect(text).toContain("- (not set)");
    expect(text).toMatch(/- MSFT: 2 units, avg cost \$400\.50/);
    expect(text).toContain("lesson: wait for a setup");
  });

  it("stays well under the server's size limit", () => {
    expect(text.length).toBeLessThan(60_000);
  });
});
